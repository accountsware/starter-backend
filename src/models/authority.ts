import * as Sequelize from 'sequelize';
import { sequelize } from '../instances/sequelize';

export interface AuthorityAddModel {
    id?: number
    name: string
}

export interface AuthorityModel extends Sequelize.Model<AuthorityModel, AuthorityAddModel> {
    id: number
    name: string
    createdAt: string
    updatedAt: string
}

export interface AuthorityViewModel {
    id: number
    name: string
}

export const Authority = sequelize.define<AuthorityModel, AuthorityAddModel>('authority', {
    id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING(50),
        unique: true
    }
});