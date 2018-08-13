import * as Actions from '../lib/Actions';
import Action from '../lib/Action'

export default class CompanionAPI {

    static async handler(request, vueInst) {
        const action = Action.fromJson(request);
        if (!Object.keys(Actions).map(key => Actions[key]).includes(request.type)) return;
        return await this[request.type](request, vueInst);
        
    }

    static async [Actions.GET_ACCOUNT](request, vue) {
        try {
            let response= await vue.requestAccess(request.payload);
            console.log (response);
            return {id:request.id, result: response};
        }catch(e) {
            return e;
        }
    }

    static async [Actions.REQUEST_SIGNATURE](request, vue) {            
        try {
            let response= await vue.requestTx(request.payload);
            console.log (response);
            return {id:request.id, result:response};
        }catch(e) {

            return e;
        }
    }
}