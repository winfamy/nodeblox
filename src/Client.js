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
                url: `https://www.roblox.com/my/groupadmin.aspx?gid=${groupId}`,
                followRedirect: false
            }
    
            this.request(opts, (err, resp, body) => {
                if (err) return reject(err)
    
                if (resp.statusCode !== 200) {
                    return reject(new Error('Not allowed to check admin page of given group'))
                }
    
                let robux = body.match(/<span class='robux'>(\d+)<\/span>/)[1]    
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
}