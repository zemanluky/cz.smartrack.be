import {reset, seed} from "drizzle-seed";
import { db } from "./db";
import { user } from "./schema/user";
import { product } from "./schema/product";
import {organization} from "./schema/organization";

async function main() {
    await reset(db, { organization: organization, user: user, product: product });

    await db.insert(user).values({
        role: 'sys_admin',
        name: 'Admin Smart Rack',
        email: 'admin@smartrack.cz',
        password_hash: await Bun.password.hash('123456Ab$')
    });

    // await seed(db, { organization: organization, user: user, product: product }).refine((funcs) => ({
    //     organization: {
    //         count: 30,
    //         columns: {
    //             name: funcs.companyName({ isUnique: true }),
    //             active: funcs.boolean()
    //         },
    //         with: {
    //             user: 3,
    //             product: 80
    //         }
    //     },
    //     product: {
    //         columns: {
    //             name: funcs.string(),
    //             price: funcs.number({ precision: 100, minValue: 1 }),
    //             deleted_at: funcs.weightedRandom([
    //                 {
    //                     weight: 0.15,
    //                     value: funcs.default({ defaultValue: null }),
    //                 },
    //                 {
    //                     weight: 0.85,
    //                     value: funcs.timestamp()
    //                 }
    //             ])
    //         }
    //     },
    //     user: {
    //         columns: {
    //             organization_id: funcs.default({ defaultValue: null }),
    //             role: funcs.valuesFromArray({ values: ['org_admin', 'org_user'] }),
    //             email: funcs.email(),
    //             password_hash: funcs.default({ defaultValue: password }),
    //             name: funcs.fullName()
    //         }
    //     },
    // })).then(() => seed(db, { user: user }).refine((funcs) => ({
    //         user: {
    //             count: 3,
    //             columns: {
    //                 organization_id: funcs.default({ defaultValue: null }),
    //                 role: funcs.default({ defaultValue: 'sys_admin' }),
    //                 email: funcs.valuesFromArray({
    //                     values: ['admin@smartrack.cz', 'admin2@smartrack.cz', 'admin3@smartrack.cz'],
    //                     isUnique: true
    //                 }),
    //                 password_hash: funcs.default({ defaultValue: password }),
    //                 name: funcs.fullName()
    //             }
    //         },
    //     })
    // ));
}

try {
    main();
}
catch (e) {
    console.error('Failed to seed db.');
    console.error(e);
}
