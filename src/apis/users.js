import request from 'request'

export function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        request.get(`https://api.roblox.com/users/get-by-username?username=${username}`, (err, resp, body) => {
            if (err) return reject(err)

            let json = JSON.parse(body)
            if (json.success === false) {
                return resolve({ success: false, error: 'User does not exist' })
            } else {
                return resolve({
                    success: true,
                    data: {
                        userId: json.Id,
                        username: json.Username
                    }
                })
            }
        })
    })
}

export function getUserById(userId) {
    return new Promise((resolve, reject) => {
        request.get(`https://api.roblox.com/Users/${userId}`, (err, resp, body) => {
            if (err) return reject(err)

            let json = JSON.parse(body)
            if (json.errors) {
                return resolve({ success: false, error: 'User does not exist' })
            } else {
                return resolve({
                    success: true,
                    data: {
                        userId: json.Id,
                        username: json.Username
                    }
                })
            }
        })
    })
}

export function getUserThumbnail(userId) {
    return new Promise((resolve, reject) => {
        request({
            url: `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`
        }, (err, resp, body) => {
            if (err) return reject(err)
            if (resp.statusCode != 200) return reject(new Error("Failed to fetch inventory privacy"))

            let json = JSON.parse(body)
            return resolve(json.data[0].imageUrl)
        })
    })
}