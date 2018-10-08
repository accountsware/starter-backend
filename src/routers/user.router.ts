import { Router } from 'express'
import * as core from 'express-serve-static-core';
import { matchedData } from 'express-validator/filter';
import { validationResult } from 'express-validator/check';
import { userRules } from '../rules/user.rules';
import { UserService } from '../services/user.service';
import {
    UserActivateModel,
    UserAddModel,
    UserIdModel,
    UserPasswordResetKeyModel,
    UserPasswordResetModel,
    UserViewModel
} from '../models/user';
import { ResponseMessage } from '../common/response-message';
import { getLogger, Logger } from 'log4js';

export const userRouter = Router();
const userService = new UserService();
const logger: Logger = getLogger('http');
logger.level = process.env.LOGGER_LEVEL;

userRouter.get('/api/account/verify', userRules['forUserAccount'], (req: core.Request, res: core.Response) => {
    logger.debug('Verifying account');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        /*
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
        */
        return res.json(false);
    }

    const payload = matchedData(req, {locations: ['headers']}) as any;
    const token = payload.authorization.split(' ')[1];

    return userService.verifyToken(token).then(t => {
        res.json(t);
    });
});

userRouter.get('/api/account/verify/admin', userRules['forAdminAccount'], (req: core.Request, res: core.Response) => {
    logger.debug('Verifying admin account');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        /*
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
        */
        return res.json(false);
    }

    const payload = matchedData(req, {locations: ['headers']}) as any;
    const token = payload.authorization.split(' ')[1];

    return userService.verifyAdminToken(token).then(t => {
        res.json(t);
    });
});

userRouter.get('/api/accounts', userRules['forAdminAccount'], (req: core.Request, res: core.Response) => {
    logger.debug('Getting accounts');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    return userService.getAccounts().then(accounts => {
        msg.success = 1;
        msg.data = accounts;
        res.json(msg);
    });
});

userRouter.get('/api/account', userRules['forUserAccount'], (req: core.Request, res: core.Response) => {
    logger.debug('Getting account');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req, {locations: ['headers']}) as any;
    const token = payload.authorization.split(' ')[1];

    const user = userService.getAccount(token);
    return user.then(u => {
        msg.success = 1;
        msg.data.push({
            id: u.id,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name
        });
        res.json(msg);
    });
});

userRouter.get('/api/admin/account/:id', userRules['forAdminAccount'], (req: core.Request, res: core.Response) => {
    logger.debug('Getting account by id');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    userService.getUserById(req.params.id).then(account => {
        msg.success = 1;
        msg.data.push(account);
        res.json(msg);
    });
});

userRouter.post('/api/account', userRules['forRegister'], (req: core.Request, res: core.Response) => {
    logger.debug('Registering a new account');
    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req) as UserAddModel;
    const user = userService.register(payload);

    return user.then(() => {
        msg.success = 1;
        msg.data.push('Account created');
        res.json(msg);
    });
});

userRouter.put('/api/account', userRules['forUpdateUserAccount'], (req: core.Request, res: core.Response) => {
    logger.debug('Updating current account');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req, {locations: ['body', 'headers']}) as any;
    const token = payload.authorization.split(' ')[1];

    userService.update(payload, token).then(() => {
        msg.success = 1;
        msg.data.push('Account updated');
        res.json(msg);
    });
});

userRouter.put('/api/admin/account/:id', userRules['forUpdateUserAccountAsAdmin'], (req: core.Request, res: core.Response) => {
    logger.debug('Updating current account by id.');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req, {locations: ['body', 'params']}) as UserViewModel;
    logger.debug(payload);
    userService.updateAsAdmin(payload).then(() => {
        msg.success = 1;
        msg.data.push('Account updated');
        res.json(msg);
    });
});

userRouter.put('/api/account/password', userRules['forUpdatePassword'], (req: core.Request, res: core.Response) => {
    logger.debug('Updating current account password');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req, {locations: ['body', 'headers']}) as any;
    const token = payload.authorization.split(' ')[1];

    userService.updatePassword(payload, token).then(() => {
        msg.success = 1;
        msg.data.push('Password updated');
        res.json(msg);
    });
});

userRouter.post('/api/account/reset/password', userRules['forForgotPassword'], (req: core.Request, res: core.Response) => {
    logger.debug('Initiating password reset.');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req) as UserPasswordResetModel;
    userService.requestPasswordReset(payload).then(u => {
        if (u) {
            msg.success = 1;
            msg.data.push('Password reset requested.');
        } else {
            msg.success = 0;
            msg.data.push('Account not found');
        }
        res.json(msg);
    });
});

userRouter.put('/api/account/reset/password/:reset_key', userRules['forResetPassword'], (req: core.Request, res: core.Response) => {
    logger.debug('Resetting password using reset key.');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req, {locations: ['body', 'params']}) as UserPasswordResetKeyModel;
    userService.updatePasswordUsingResetKey(payload).then(([rowsUpdated, ums]) => {
        if (ums.length > 0) {
            msg.success = 1;
            msg.data.push('Password reset');
        } else {
            msg.success = 0;
            msg.data.push('Account not found');
        }
        res.json(msg);
    });
});

userRouter.post('/api/account/activate', userRules['forActivate'], (req: core.Request, res: core.Response) => {
    logger.debug('Activating account');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req) as UserActivateModel;
    userService.activateAccount(payload).then(([rowsUpdated, ums]) => {
        if (ums.length > 0) {
            msg.success = 1;
            msg.data.push('Account activated.');
        } else {
            msg.success = 0;
            msg.data.push('Account not found');
        }
        res.json(msg);
    });
});

userRouter.delete('/api/account/:id', userRules['forRemoveUser'], (req: core.Request, res: core.Response) => {
    logger.debug('Removing account.');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req, {locations: ['params']}) as UserIdModel;
    userService.remove(payload).then(num => {
        if (num) {
            msg.success = 1;
            msg.data.push('Account removed.');
        } else {
            msg.success = 0;
            msg.data.push('Account not found');
        }
        res.json(msg);
    });
});

userRouter.delete('/api/admin/account/:id', userRules['forRemoveUserAsAdmin'], (req: core.Request, res: core.Response) => {
    logger.debug('Removing account.');

    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        return res.status(422).json(msg);
    }

    const payload = matchedData(req, {locations: ['params']}) as UserIdModel;
    userService.remove(payload).then(num => {
        if (num) {
            msg.success = 1;
            msg.data.push('Account removed.');
        } else {
            msg.success = 0;
            msg.data.push('Account not found');
        }
        res.json(msg);
    });
});

userRouter.post('/api/login', userRules['forLogin'], (req: core.Request, res: core.Response) => {
    logger.debug('Logging in');
    const errors = validationResult(req);
    const msg = new ResponseMessage();

    if (!errors.isEmpty()) {
        msg.success = 0;
        msg.data = errors.array();
        res.status(422).json(msg);
    }

    const payload = matchedData(req) as UserAddModel;
    const token = userService.login(payload);

    return token.then(t => {
        if (t) {
            msg.success = 1;
            msg.data.push(t.token);
        } else {
            msg.success = 0;
            msg.data.push('Account not found');
        }
        res.json(msg);
    });
});