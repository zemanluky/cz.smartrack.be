import Elysia, {t} from "elysia";
import {authUserPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {organizationData, organizationListFilters, organizationResponse} from "../model/organization.model";
import {errorResponse} from "../model/error.model";
import {
    listOrganizations,
    removeOrganization,
    retrieveOrganization,
    saveOrganization
} from "../service/organization.service";
import {paginatedResponse} from "../model/pagination.model";

export const organizationController = new Elysia({
    prefix: '/organization',
    tags: ['Organization'],
    detail: {
        security: [{ bearerAuth: [] }]
    }
})
    .use(authUserPlugin)
    .guard({ authUser: EAuthRequirement.Required })
    .get(
        '/', async ({ query }) => {
            return await listOrganizations(query);
        }, {
            query: organizationListFilters,
            detail: { description: 'Retrieves a paginated list of organizations with the option to filter results.' },
            response: {
                200: paginatedResponse(organizationResponse)
            }
        }
    )
    .post(
        '/', async ({ body, set }) => {
            const createdOrganization = await saveOrganization(body);

            set.status = 201;
            return createdOrganization;
        }, {
            detail: { description: 'Creates a new organization.' },
            body: organizationData,
            response: {
                201: organizationResponse,
                400: errorResponse
            }
        }
    )
    .get('/overview', 'Get overview for the current organization') // TODO: Implement

    .guard({ params: t.Object({ id: t.Number() }) })
    .get(
        '/:id', async ({ params: { id } }) => {
            return await retrieveOrganization(id);
        }, {
            detail: { description: 'Retrieves organization by its ID.' },
            response: {
                200: organizationResponse,
                404: errorResponse
            },
        }
    )
    .put(
        '/:id', async ({ params: { id }, body }) => {
            return await saveOrganization(body, id);
        }, {
            detail: { description: 'Updates organization by its ID.' },
            body: organizationData,
            response: {
                200: organizationResponse,
                400: errorResponse,
                404: errorResponse,
            },
        }
    )
    .delete(
        '/:id', async ({ params: { id }, set }) => {
            await removeOrganization(id);
            set.status = 204;
            return;
        }, {
            detail: { description: 'Deletes existing organization by its ID.' },
            response: {
                204: t.Undefined()
            }
        }
    )
;