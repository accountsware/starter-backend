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
import { ResponseMessage } from "../common/response-message";

export class UserService {
    private readonly _saltRounds = 12;
    private readonly _jwtSecret = '0.rfyj3n9nqh';

    private static _user;

    private logger: Logger = getLogger('user-authority');

    constructor() {
        this.logger.level = process.env.LOGGER_LEVEL;
    }

    register({ email, password }: UserAddModel) {
        return bcrypt.hash(password, this._saltRounds)
            .then(hash => {
                return User.create({ email, password: hash })
                    .then(u => {
                        UserAuthority.create({user_id: u!.id, authority_id: 2});
                        return this.getUserById(u!.id);
                    })
            });
    }

    update({ first_name, last_name, id }: UserViewModel) {
        return User.findById(id).then(user => {
            if (user) {
               user.update({
                   first_name: first_name,
                   last_name: last_name
               }).then(q => q);
            }
        });
    }

    updatePassword({ email, password }: UserAddModel) {
        return bcrypt.hash(password, this._saltRounds)
            .then(hash => {
                return User.findOne({ where: { email } }).then(u => {
                    if (u) {
                        return u.update({
                            password: hash
                        });
                    }
                });
            });
    }

    requestPasswordReset({ email }: UserPasswordResetModel): Promise<ResponseMessage> {
        const _this = this;
        const newPass = this.makeRandomString(8);
        const resetKey = this.makeRandomString(20);
        const resetUrl = process.env.BASE_WEB_CLIENT_URL + 'password-reset-finish/'  + resetKey;

        return bcrypt.hash(newPass, this._saltRounds)
            .then(hash => {
                return User.findOne({ where: { email }}).then(u => {
                    if (u) {
                        return u.update({
                            password: hash,
                            reset_key: resetKey,
                            reset_date: moment().format('YYYY-MM-DD HH:mm:ss')
                        }).then(([rowsUpdated, ums]) => {
                            const msg = new ResponseMessage();
                            if (rowsUpdated > 0) {
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
                                    console.log(error);
                                });
                            } else {
                                msg.success = 0;
                                msg.data.push('Password not updated: Email not found.');
                                return msg;
                            }
                        });
                    }
                });
            });
    }

    updatePasswordUsingResetKey({ password, reset_key }: UserPasswordResetKeyModel) {
        return bcrypt.hash(password, this._saltRounds).then(hash => {
            return User.findOne({ where: { reset_key }}).then(u => {
                if (u) {
                    return u.update({
                        password: hash,
                        reset_key: null,
                        reset_date: null
                    });
                }
            });
        });
    }

    activateAccount({ activation_key }: UserActivateModel) {
        return User.findOne({ where: { activation_key } }).then(u => {
            if (u) {
                return u.update({
                    activated_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    activated: true,
                    activation_key: null
                });
            }
        });
    }

    remove({ id }: UserIdModel) {
        return User.findById(id).then(u => {
            return u.destroy();
        });
    }

    login({ email }: UserAddModel) {
        return User.findOne({ where: { email } }).then(u => {
            const { id, email } = u!;
            return { token: jwt.sign({ id, email }, this._jwtSecret) }
        });
    }

    verifyToken(token: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            jwt.verify(token, this._jwtSecret, (err, decoded) => {
                if (err) {
                    resolve(false);
                    return;
                }

                resolve(true);
                return;
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
                    resolve(bool);
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

                UserService._user = User.findById(decoded['id']);
                resolve(UserService._user);
                return;
            });
        });
    }

    getAccounts(): Promise<UserViewModel[]> {
        return new Promise<UserViewModel[]>((resolve, reject) => {
            User.findAll({
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