import * as Bluebird from 'Bluebird';
import * as Sequelize from 'sequelize';
import { UserAuthority, UserAuthorityModel, UserAuthorityViewModel } from '../models/user-authority';
import { getLogger, Logger } from 'log4js';

export class UserAuthorityService {

    private logger: Logger = getLogger('user-authority');

    constructor() {
        this.logger.level = process.env.LOGGER_LEVEL;
    }


    createAdmin(userId: number): Bluebird<UserAuthorityModel> {
        return UserAuthority.create({ user_id: userId, authority_id: 1 })
            .then(ua => ua);
    }

    removeAdmin(userId: number): Bluebird<void> {
        return UserAuthority.destroy({
            where: {
                user_id: {
                    [Sequelize.Op.eq]: userId
                },
                authority_id: {
                    [Sequelize.Op.eq]: 1
                }
            }
        }).then(() => {
            // nothing to do here.
        }).catch((error) => {
            this.logger.error(error);
        });
    }

    getByUserId(userId: number): Bluebird<UserAuthorityViewModel[]> {
        return UserAuthority.findAll({
            where: {
                user_id: {
                    [Sequelize.Op.eq]: userId
                }
            },
            attributes: { exclude: ['id'] }
        }).then(models => models);
    }

    isAdmin(userId: number): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            UserAuthority.findAll({
                where: {
                    user_id: {
                        [Sequelize.Op.eq]: userId
                    },
                    authority_id: {
                        [Sequelize.Op.eq]: 1
                    }
                },
                attributes: { exclude: ['id'] }
            }).then(uas => {
                resolve(uas.length > 0);
            }).catch((error) => {
                this.logger.error(error);
                reject(error);
            });
        });
    }
}