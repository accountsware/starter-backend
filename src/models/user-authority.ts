import * as Sequelize from 'sequelize';
import { sequelize } from '../instances/sequelize';
import { User } from './user';
import { Authority } from './authority';

export interface UserAuthorityAddModel {
    user_id: number
    authority_id: number
}

export interface UserAuthorityModel extends Sequelize.Model<UserAuthorityModel, UserAuthorityAddModel> {
    user_id: number
    authority_id: number
    createdAt: string
    updatedAt: string
}

export interface UserAuthorityViewModel {
    user_id: number
    authority_id: number
}

export const UserAuthority = sequelize.define<UserAuthorityModel, UserAuthorityAddModel>('user_authority', {
    user_id: {
        type: Sequelize.BIGINT,
        references: {
            model: User,
            key: 'id',
        },
        primaryKey: true
    },
    authority_id: {
        type: Sequelize.BIGINT,
        references: {
            model: Authority,
            key: 'id'
        },
        primaryKey: true
    }
});