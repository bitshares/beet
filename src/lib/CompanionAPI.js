import * as Actions from '../lib/Actions';
import Action from '../lib/Action'

export default class CompanionAPI {

    static async handler(request, vueInst) {
        const action = Action.fromJson(request);
        // Only accept pre-defined messages.
        if (!Object.keys(Actions).map(key => Actions[key]).includes(request.type)) return;
        return await this[request.type](request, vueInst);
    }


    /***
     * Checks if an Identity has permissions for the origin
     * @param request
     * @returns {Promise.<*>}
     */

    static async [Actions.GET_ACCOUNT](request, vue) {
        //return {id:request.id, result:PermissionService.identityFromPermissions(request.payload.origin)};
        let response= await vue.$refs.accountReqModal.show();
        console.log (response);
        return response;
    }

}