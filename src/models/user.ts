import * as Sequelize from 'sequelize';
import { sequelize } from '../instances/sequelize';

export interface UserPasswordResetModel {
    email: string
}

export interface UserPasswordResetKeyModel {
    password: string
    password_confirm: string
    reset_key: string
}

export interface UserActivateModel {
    activation_key: string;
}

export interface UserIdModel {
    id: number
}

export interface UserAddModel {
    id?: number
    email: string
    password: string
    first_name?: string
    last_name?: string
    activated?: boolean
    activated_date?: string
    activation_key?: string
    reset_key?: string
    reset_date?: string
    deleted?: boolean
}

export interface UserModel extends Sequelize.Model<UserModel, UserAddModel> {
    id: number
    email: string
    password: string
    first_name: string
    last_name: string
    activated: boolean
    activated_date: string
    activation_key: string
    reset_key: string
    reset_date: string
    deleted: boolean
    createdAt: string
    updatedAt: string
}

export interface UserViewModel {
    id: number
    email: string
    first_name: string
    last_name: string
}

export const User = sequelize.define<UserModel, UserAddModel>('user', {
    id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    email: {
        type: Sequelize.STRING,
        unique: true
    },
    password: Sequelize.STRING,
    first_name: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null
    },
    last_name: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null
    },
    activated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    activated_date: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
    },
    activation_key: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null
    },
    reset_date: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
    },
    reset_key: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null
    },
    deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
});