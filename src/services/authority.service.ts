import * as Bluebird from 'Bluebird';
import * as Sequelize from 'sequelize';
import { Authority, AuthorityViewModel } from "../models/authority";

export class AuthorityService {

    getAll(): Bluebird<AuthorityViewModel[]> {
        return Authority.findAll({
            attributes: ['id', 'name']
        });
    }

    getAuthorityById(id: number): Bluebird<AuthorityViewModel> {
        return Authority.findOne(
            {
                where: {
                    id: {
                        [Sequelize.Op.eq]: id
                    }
                },
                attributes: ['id', 'name']
            }
        );
    }

    getAuthorityByName(name: string): Bluebird<AuthorityViewModel> {
        return Authority.findOne(
            {
                where: {
                    name: {
                        [Sequelize.Op.eq]: name.trim().toUpperCase()
                    }
                },
                attributes: ['id', 'name']
            }
        );
    }
}