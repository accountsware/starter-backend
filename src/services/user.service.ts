import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as Bluebird from 'Bluebird';
import * as moment from 'moment';
import {
    User,
    UserActivateModel,
    UserAddModel,
    UserIdModel,
    UserPasswordResetKeyModel,
    UserPasswordResetModel,
    UserViewModel
} from '../models/user';
import { UserAuthority } from '../models/user-authority';
import * as Sequelize from 'sequelize';
import { getLogger, Logger } from 'log4js';
import { Email } from '../instances/email';
import { ResponseMessage } from '../common/response-message';

export class UserService {
    private readonly _saltRounds = 12;
    private readonly _jwtSecret = '0.rfyj3n9nqh';

    private logger: Logger = getLogger('user');

    constructor() {
        this.logger.level = process.env.LOGGER_LEVEL;
    }

    register({ email, password }: UserAddModel): Promise<void> {
        const _this = this;
        return bcrypt.hash(password, this._saltRounds)
            .then(hash => {
                return User.create({ email, password: hash, activation_key: this.makeRandomString(20) })
                    .then(u => {
                        return User.count().then(c => {
                            let authorityId;
                            if (c === 1) {
                                // the first person to register is the admin.
                                authorityId = 1;
                            } else {
                                authorityId = 2;
                            }
                            UserAuthority.create({user_id: u!.id, authority_id: authorityId}).then(q => {
                                const msg = new ResponseMessage();
                                const activateUrl = process.env.BASE_WEB_CLIENT_URL + 'activate/' + u.activation_key;
                                const text = 'A new account has been created for you at ' + process.env.BASE_WEB_CLIENT_URL + '.  To activate this account, please visit ' + activateUrl + '.';
                                const html = '<h3>A new account has been created for you at <a href="' + process.env.BASE_WEB_CLIENT_URL + '">DonaldMcDougal.com</a></h3>. ' +
                                    '<p>To activate this account, please visit <a href="' + activateUrl + '">' + activateUrl + '</a></p>';
                                Email.sendEmail(process.env.CONTACT_EMAIL, [u.email], [], 'DonaldMcDougal.com account creation',
                                    text, html).then(() => {
                                    _this.logger.debug('Account created');
                                    msg.success = 1;
                                    msg.data.push('Account created.  Please check your email to activate your account.');
                                    return msg;
                                }).then(msg => {
                                    if (msg.success === 0) {
                                        _this.logger.error(msg.data[0]);
                                    } else {
                                        _this.logger.debug('Email sent.');
                                    }
                                    return msg;
                                }).catch((error) => {
                                    _this.logger.error(error);
                                });
                            });
                        });
                    })
            });
    }

    update({ first_name, last_name }: UserViewModel, token) {
        return this.getAccount(token).then(q => {
            return User.findOne({ where: {id: q.id, deleted: false } }).then(u => {
                if (u) {
                    return u.update({
                        first_name,
                        last_name
                    }).then(q => q);
                } else {
                    return null;
                }
            });
        });
    }

    updateAsAdmin({ first_name, last_name, id }: UserViewModel) {
        return User.findOne({ where: {id: id, deleted: false } }).then(u => {
            if (u) {
                return u.update({
                    first_name,
                    last_name
                }).then(q => q);
            } else {
                return null;
            }
        });
    }

    updatePassword({ password }: UserAddModel, token) {
        return bcrypt.hash(password, this._saltRounds)
            .then(hash => {
                return this.getAccount(token).then(q => {
                    return User.findOne({ where: { id: q.id, deleted: false } }).then(u => {
                        if (u) {
                            return u.update({
                                password: hash
                            }).then(q => q);
                        } else {
                            return null;
                        }
                    });
                });
            });
    }

    requestPasswordReset({ email }: UserPasswordResetModel): Promise<UserViewModel> {
        const _this = this;
        const newPass = this.makeRandomString(8);
        const resetKey = this.makeRandomString(20);
        const resetUrl = process.env.BASE_WEB_CLIENT_URL + 'password-reset-finish/'  + resetKey;

        return bcrypt.hash(newPass, this._saltRounds)
            .then(hash => {
                return User.findOne({ where: { email, deleted: false }}).then(u => {
                    if (u) {
                        return u.update({
                            password: hash,
                            reset_key: resetKey,
                            reset_date: moment().format('YYYY-MM-DD HH:mm:ss')
                        }).then(([rowsUpdated, ums]) => {
                            const msg = new ResponseMessage();
                            const text = 'You have requested a password reset.  If you did not make this request, please contact ' +
                                process.env.CONTACT_EMAIL + '.  To reset your password, please visit ' + resetUrl + ' to create a new one.';
                            const html = '<p>You have requested a password reset.  If you did not make this request, please contact '
                                + '<a href="mailto:' + process.env.CONTACT_EMAIL + '">' + process.env.CONTACT_EMAIL + '</a>. ' +
                                'To reset your password, please visit ' + resetUrl + ' to create a new one.';
                            Email.sendEmail(process.env.CONTACT_EMAIL, [email], [], 'DonaldMcDougal.com password reset request',
                                text, html).then(() => {
                                _this.logger.debug('Password reset requested');
                                msg.success = 1;
                                msg.data.push('Password reset requested.');
                                return msg;
                            }).then(msg => {
                                if (msg.success === 0) {
                                    _this.logger.error(msg.data[0]);
                                }
                                return msg;
                            }).catch((error) => {
                                _this.logger.error(error);
                            });
                            return {
                                id: u.id,
                                email: u.password,
                                first_name: u.first_name,
                                last_name: u.last_name
                            };
                        });
                    } else {
                        return null;
                    }
                });
            });
    }

    updatePasswordUsingResetKey({ password, reset_key }: UserPasswordResetKeyModel) {
        return bcrypt.hash(password, this._saltRounds).then(hash => {
            return User.findOne({ where: { reset_key, deleted: false }}).then(u => {
                if (u) {
                    return u.update({
                        password: hash,
                        reset_key: null,
                        reset_date: null
                    }).then(q => q);
                } else {
                    return null;
                }
            });
        });
    }

    activateAccount({ activation_key }: UserActivateModel) {
        return User.findOne({ where: { activation_key, deleted: false } }).then(u => {
            if (u) {
                return u.update({
                    activated_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    activated: true,
                    activation_key: null
                }).then(q => q);
            } else {
                return null;
            }
        });
    }

    remove({ id }: UserIdModel) {
        return User.findById(id).then(u => {
            if (u) {
                return u.update({ id: id, deleted: true }).then(() => {
                    return true;
                });
            } else {
                return false;
            }
        });
    }

    login({ email }: UserAddModel) {
        return User.findOne({ where: { email, deleted: false } }).then(u => {
            if (u) {
                const { id, email } = u!;
                return { token: jwt.sign({ id, email }, this._jwtSecret) }
            } else {
                return null;
            }
        });
    }

    verifyToken(token: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            jwt.verify(token, this._jwtSecret, (err, decoded) => {
                if (err) {
                    resolve(false);
                    return;
                }
                return User.findOne({ where: { id: decoded['id'], deleted: false } }).then(u => {
                    if (u) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            })
        });
    }

    verifyAdminToken(token: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            jwt.verify(token, this._jwtSecret, (err, decoded) => {
                if (err) {
                    resolve(false);
                }

                return this.isAdmin(decoded['id']).then(bool => {
                    if (!bool) {
                        resolve(false);
                    } else {
                        return User.findOne({ where: { id: decoded['id'], deleted: false } }).then(u => {
                            if (u) {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        });
                    }
                });
            })
        });
    }

    getAccount(token: string): Promise<UserViewModel> {
        return new Promise<UserViewModel>((resolve, reject) => {
            jwt.verify(token, this._jwtSecret, (err, decoded) => {
                if (err) {
                    resolve(null);
                    return;
                }

                User.findOne({ where: { id: decoded['id'], deleted: false },
                    attributes: ['id', 'email', 'first_name', 'last_name']
                }).then(u => {
                    if (u) {
                        resolve(u);
                    } else {
                        resolve(null);
                    }
                });
                return;
            });
        });
    }

    getAccounts(): Promise<UserViewModel[]> {
        return new Promise<UserViewModel[]>((resolve, reject) => {
            User.findAll({
                where: { deleted: false },
                attributes: ['id', 'email', 'first_name', 'last_name']
            }).then(users => {
                resolve(users);
            });
        });
    }

    getUserById(id: number): Bluebird<UserViewModel> {
        return User.findOne({
            where: {
                id: {
                    [Sequelize.Op.eq]: id
                },
                deleted: {
                    [Sequelize.Op.eq]: false
                }
            },
            attributes: ['id', 'email', 'first_name', 'last_name']
        });
    }

    private isAdmin(userId: number): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            UserAuthority.findAll({
                where: {
                    user_id: {
                        [Sequelize.Op.eq]: userId
                    },
                    authority_id: {
                        [Sequelize.Op.eq]: 1
                    }
                }
            }).then(uas => {
                resolve(uas.length > 0);
            }).catch((error) => {
                this.logger.error(error);
                reject(error);
            });
        });
    }

    private makeRandomString(length: number): string {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const textArr: string[] = [];

        for (let i = 0; i < length; i++) {
            textArr.push(possible.charAt(Math.floor(Math.random() * possible.length)));
        }
        return textArr.join('');
    }
}