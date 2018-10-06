import * as bcrypt from 'bcrypt';
import {body, check, header} from 'express-validator/check';
import { User } from '../models/user';
import { UserService } from '../services/user.service';

export const userRules = {
    forRegister: [
        check('email')
            .isEmail().withMessage('Invalid email format')
            .custom(email => User.find({ where: { email } }).then(u => !!!u)).withMessage('Email exists'),
        check('password')
            .isLength({ min: 8 }).withMessage('Invalid password'),
        check('confirm_password')
            .custom((confirmPassword, { req }) => req.body.password === confirmPassword).withMessage('Passwords are different')
    ],
    forUpdatePassword: [
        check('password')
            .isLength({ min: 8 }).withMessage('Invalid password'),
        check('confirm_password')
            .custom((confirmPassword, { req }) => req.body.password === confirmPassword).withMessage('Passwords are different')
    ],
    forForgotPassword: [
        check('email')
            .isEmail().withMessage('Invalid email format')
            .custom(email => User.find({ where: { email } }).then(u => !!!u)).withMessage('Email does not exist')
    ],
    forResetPassword: [
        check('password')
            .isLength({ min: 8 }).withMessage('Invalid password'),
        check('confirm_password')
            .custom((confirmPassword, { req }) => req.body.password === confirmPassword).withMessage('Passwords are different'),
        check('reset_key')
            .isLength( { min: 20, max: 20 }).withMessage('Invalid reset key')
            .matches(/[a-zA-Z0-9]+/).withMessage('Invalid reset key')
            .custom(resetKey => User.find({ where: { reset_key: resetKey } }).then(u => u)).withMessage('Reset key does not exist')
    ],
    forActivate: [
        check('activation_key')
            .isLength( { min: 20, max: 20 }).withMessage('Invalid activation key length')
            .matches(/[a-zA-Z0-9]+/).withMessage('Invalid activation key')
            .custom(activationKey => User.find({ where: { activation_key: activationKey } }).then(u => u)).withMessage('Activation key does not exist')
    ],
    forRemove: [
        check('id').isNumeric().withMessage('ID must be numeric')
            .custom(id => User.findById(id).then(u => !!!u)).withMessage('User does not exist')
    ],
    forLogin: [
        check('email')
            .isEmail().withMessage('Invalid email format')
            .custom(email => User.findOne({ where: { email } }).then(u => !!u)).withMessage('Invalid email or password'),
        check('password')
            .custom((password, { req }) => {
                return User.findOne({ where: { email: req.body.email } })
                    .then(u => bcrypt.compare(password, u!.password))
            }).withMessage('Invalid email or password')
    ],
    forUserAccount: [
        header('Authorization')
            .custom((token, { req }) => {
                const auth = req.headers.authorization;
                const authSplit = auth.split(' ');
                if (authSplit.length !== 2 || authSplit[0] !== 'Bearer') {
                    return new Promise((resolve, reject) => {
                        resolve(false);
                    })
                }
                const u: UserService = new UserService();
                return u.verifyToken(authSplit[1]).then(q => q);
            }).withMessage('Invalid token')
    ],
    forUpdateUserAccount: [
        header('Authorization')
            .custom((token, { req }) => {
                const auth = req.headers.authorization;
                const authSplit = auth.split(' ');
                if (authSplit.length !== 2 || authSplit[0] !== 'Bearer') {
                    return new Promise((resolve, reject) => {
                        resolve(false);
                    })
                }
                const u: UserService = new UserService();
                return u.verifyToken(authSplit[1]).then(q => q);
            }).withMessage('Invalid token'),
        check('first_name')
            .isString().withMessage('First name must be a string'),
        check('last_name')
            .isString().withMessage('Last name must be a string')
    ],
    forAdminAccount: [
        header('Authorization')
            .custom((token, { req }) => {
                const auth = req.headers.authorization;
                const authSplit = auth.split(' ');
                if (authSplit.length !== 2 || authSplit[0] !== 'Bearer') {
                    return new Promise((resolve, reject) => {
                        resolve(false);
                    });
                }
                const u: UserService = new UserService();
                return u.verifyAdminToken(authSplit[1]).then(q => q);
            }).withMessage('Invalid token')
    ],
    forUpdateUserAccountAsAdmin: [
        header('Authorization')
            .custom((token, { req }) => {
                const auth = req.headers.authorization;
                const authSplit = auth.split(' ');
                if (authSplit.length !== 2 || authSplit[0] !== 'Bearer') {
                    return new Promise((resolve, reject) => {
                        resolve(false);
                    })
                }
                const u: UserService = new UserService();
                return u.verifyAdminToken(authSplit[1]).then(q => q);
            }).withMessage('Invalid token'),
        check('first_name')
            .isString().withMessage('First name must be a string'),
        check('last_name')
            .isString().withMessage('Last name must be a string'),
        check('id')
            .exists().withMessage('You must provide a user ID')
            .isNumeric().withMessage('The user ID must be numeric')
    ]
};