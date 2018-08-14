export default class operations {

    static async generate(data, api, account_id) {
        let op_type;
        let op_data;
        switch (data.action) {
            case 'vote':
                op_type = 'account_update';
                console.log('here' + account_id);
                let accounts = await api.db_api()
                    .exec("get_objects", [
                        [account_id]
                    ]);
                let updateObject = {
                    account: account_id
                };

                let account = accounts[0];

                let new_options = account.options;
                new_options.votes.push(data.vote_id)
                new_options.votes = new_options.votes.sort((a, b) => {
                    let a_split = a.split(":");
                    let b_split = b.split(":");
                    return (
                        parseInt(a_split[1], 10) - parseInt(b_split[1], 10)
                    );
                });
                updateObject.new_options = new_options;
                op_data = updateObject;

                break;
        }
        return {
            op_type: op_type,
            op_data: op_data
        };
    }
}