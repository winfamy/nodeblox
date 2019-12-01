import request from 'request'
import _ from 'lodash'

export class Client {
    constructor (data) {
        this.setup(data)
    }

    setup (data) {
        this.username = data.username
        this.password = data.password
        this.cookie = data.cookie
        this.jar = request.jar()
        this.token = null

        this.request = request.defaults({
            jar: this.jar
        })
        
        if (!_.isUndefined(data.cookie)) {
            let cookie = request.cookie(`.ROBLOSECURITY=${this.cookie}; Domain=.roblox.com; HostOnly=false`);
            this.jar.setCookie(cookie, 'https://roblox.com');
        }
    }
    
    isLoggedIn() {
        return new Promise((resolve, reject) => {
            let opts = { 
                url: 'https://www.roblox.com/navigation/userdata',
                followRedirect: false
            }
            
            this.request(opts, (err, resp, body) => {
                if (err) return reject(err)

                if(resp.statusCode === 200)
                    return resolve(true)

                opts.url = 'https://web.roblox.com/navigation/userdata'
                this.request(opts, (err, resp, body) => {
                    if (err) return reject(err)

                    return resolve(resp.statusCode === 200)
                })
            })
        })
    }
    
    getToken() {
        return new Promise((resolve, reject) => {
            if (this.token)
                resolve(true)

            let opts = { url: "https://www.roblox.com/home" }
            
            this.request(opts, (err, resp, body) => {
                this.token = body.match(/setToken\(\'(.*?)\'\)/)[1]
                return resolve(true)
            })
        })
    }

    fetchGroupFunds (groupId) {
        return new Promise((resolve, reject) => {
            let opts = { 
                url: `https://www.roblox.com/my/groupadmin.aspx?gid=${groupId}`
            }
    
            this.request(opts, (err, resp, body) => {
                if (err) return reject(err)
    
                if (resp.request.uri.pathname === '/NewLogin') {
                    return reject(
                        new Error('not logged in')
                    ) 
                }

                if (resp.statusCode !== 200) {
                    return reject(new Error('Not allowed to check admin page of given group'))
                }
    
                let robux = body.match(/<span class='icon-robux-16x16'><\/span><span>(\d+)<\/span>/)[1]    
                return resolve(parseInt(robux))
            })
        })
    }

    sendPayout ({ amount, userId, groupId }) {
        return new Promise((resolve, reject) => {
            this.getToken().then(() => {
                let percentages = JSON.stringify({ [userId.toString()]: amount.toString() })
                console.log(percentages)
                let opts = {
                    url: `https://www.roblox.com/groups/${groupId}/one-time-payout/false`,
                    method: 'post',
                    followRedirect: false,
                    form: {
                        percentages
                    },
                    headers: { 'X-CSRF-TOKEN': this.token }
                }

                this.request(opts, (err, resp, body) => {
                    if (err) return reject(err)
                    if (resp.statusCode !== 200) return reject(new Error('Invalid data submitted'))

                    return resolve(resp.statusCode === 200)
                })
            })
        })
    }

    buyItem({ itemId, price, sellerId, userAssetId }) {
        return new Promise((resolve, reject) => {
            this.getToken().then(() => {
                if (!userAssetId) userAssetId = ""
    
                let opts = {
                    method: 'POST',
                    url: `https://www.roblox.com/api/item.ashx?rqtype=purchase&productID=${itemId}&expectedCurrency=1&expectedPrice=${price}&expectedSellerID=${sellerId}&userAssetID=${userAssetId}`,
                    headers: { 'X-CSRF-TOKEN': this.token }
                }

                console.log(opts)
                
                this.request(opts, (err, resp, body) => {
                    console.log(err, body)
                    resolve('hi')
                })
            })
        })
    }
    
    deleteItem({ assetId }) {
        return new Promise((resolve, reject) => {
            this.getToken().then(() => {
                let opts = {
                    method: 'POST',
                    url: 'https://www.roblox.com/asset/delete-from-inventory',
                    headers: { 'X-CSRF-TOKEN': this.token },
                    form: { assetId },
                    followRedirect: false
                }
    
                this.request(opts, (err, resp, body) => {
                    resolve('hi')
                })
            })
        })
    }

    sendPrivateMessage({ userId, subject, messageContent }) {
        return new Promise((resolve, reject) => {
            this.getToken().then(() => {
                let opts = {
                    method: 'POST',
                    url: 'https://www.roblox.com/messages/send',
                    headers: { 'X-CSRF-TOKEN': this.token },
                    form: {
                        body: messageContent,
                        recipientid: userId.toString(),
                        cacheBuster: Date.now(),
                        subject
                    }
                }

                this.request(opts, (err, resp, body) => {
                    try {
                        let json = JSON.parse(body)
                        return json.success ? resolve() : reject({ privacy: true, message: 'Privacy?', json })
                    } catch (e) {
                        return reject({ privacy: false, message: 'No user' })
                    }
                })
            })
        })
    }

    static fetchGroupInfo({ groupId }) {
        return new Promise((resolve, reject) => {
            let opts = {

            }
        })
    }

    static fetchGroupRoles({ groupId }) {
        return new Promise((resolve, reject) => {
            let opts = {
                method: 'GET',
                url: `https://groups.roblox.com/v1/groups/${groupId}/roles`
            }

            request(opts, (err, resp, body) => {
                try {
                    let json = JSON.parse(body)
                    if (json.errors) {
                        return reject({ err: 'dunno', json })
                    }
                    
                    return resolve(json.roles)
                } catch (e) {
                    return reject({ err: 'dunno' })
                }
            })
        })
    }

    static fetchGroupRoleMembers({ groupId, roleId }) {
        let members = []

        let sendRequest = function ({ cursor, groupId, roleId }) {
            return new Promise((resolve, reject) => {
                console.log(`https://groups.roblox.com/v1/groups/${groupId}/roles/${roleId}/users?cursor=${cursor}&limit=100&sortOrder=Desc`)
                let opts = {
                    method: 'GET',
                    url: `https://groups.roblox.com/v1/groups/${groupId}/roles/${roleId}/users?cursor=${cursor}&limit=100&sortOrder=Desc`
                }
    
                request(opts, (err, resp, body) => {
                    try {
                        let json = JSON.parse(body)
                        if (json.errors) return reject({ err: 'dunno', json })

                        members = [...members, ...json.data]
                        if (json.nextPageCursor) {
                            return resolve({ cursor: json.nextPageCursor }) 
                        }

                        return resolve({ cursor: '' })
                    } catch (e) {
                        return reject(e)
                    }
                })
            })
        }

        return new Promise(async (resolve, reject) => {
            let { cursor } = await sendRequest({ cursor: '', groupId, roleId })
            while (cursor) {
                ({ cursor } = await sendRequest({ cursor, groupId, roleId }))
            }

            return resolve(members)
        })
        // https://groups.roblox.com/v1/groups/4413375/roles/29726499/users?cursor=&limit=100&sortOrder=Desc
        // https://groups.roblox.com/v1/groups/4413375/roles
    }
}
