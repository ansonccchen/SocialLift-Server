const { db } = require("../util/admin.js")

exports.getAllPosts = (req, res) => {
    db
        .collection('posts')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
            let posts = []
            data.forEach(doc => (
                posts.push({
                    postId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                    comments: doc.data().comments,
                    likes: doc.data().likes,
                    userImage: doc.data().userImage
                })
            ))
            return res.json(posts)
        })
        .catch(err =>  {
            console.error(err)
            res.status(500).json({error: err.code})
        })
}

exports.createPost = (req, res) => {
    if (req.body.body.trim() === '') return res.status(400).json({ body: 'Body must not be empty' })
    
    const newPost = {
        body: req.body.body,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString(),
        userImage: req.user.imageUrl,
        likes: 0,
        comments: 0
    }
    db
        .collection('posts')
        .add(newPost)
        .then(doc => {
            const resPost = newPost
            resPost.postId = doc.id
            res.json( resPost )
        })
        .catch(err => {
            res.status(500).json({error: "Something went wrong"})
            console.error(err)
        })
}
exports.getPost = (req, res) => {
    let postData = {}
    db.doc(`/posts/${req.params.postId}`)
        .get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({ error: "Post not found" })
            }
            postData = doc.data()
            postData.postId = doc.id
            return db.collection('comments')
                .orderBy('createdAt', 'desc')
                .where('postId', '==', req.params.postId)
                .get()
        })
        .then(data => {
            postData.commentList = []
            data.forEach(doc => {
                postData.commentList.push(doc.data())
            })
            return res.json(postData)
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({error: err.code})
        })
        
}
exports.addComment = (req, res) => {
    if (req.body.body.trim() === '') return res.status(400).json({ comment: "Must not be empty" })
    const newComment = {
        userHandle: req.user.handle,
        postId: req.params.postId,
        body: req.body.body,
        createdAt: new Date().toISOString(),
        userImage: req.user.imageUrl,
    }
    db.doc(`/posts/${req.params.postId}`).get()
        .then(doc => {
            if (!doc.exists) return res.status(404).json({message: "Post not found"})
            else return doc.ref.update({comments: doc.data().comments + 1})
        })
        .then(() => {
            return db.collection('comments').add(newComment)
        })
        .then(() => {
            return res.json(newComment)
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({error: err.code})
        })
}

exports.likePost = (req, res) => {
    const likeDoc = db.collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('postId', '==', req.params.postId)
        .limit(1)
    const postDoc = db.doc(`/posts/${req.params.postId}`)
    let postData
    postDoc.get()
        .then(doc => {
            if (doc.exists) {
                postData = doc.data()
                postData.postId = doc.id
                return likeDoc.get()
            } else {
                return res.status('404').json({message: "Post not found"})
            }
        })
        .then(data => {
            if (data.empty) {
                return db.collection('likes').add({
                    postId: req.params.postId,
                    userHandle: req.user.handle
                })
                .then(() => {
                    postData.likes++
                    return postDoc.update({likes: postData.likes})
                })
                .then(() => {
                    return res.json(postData)
                })
            } else {
                return res.status(400).json({message: "Post already liked"})
            }
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({error: err.code})
        })
}

exports.unlikePost = (req, res) => {
    const likeDoc = db.collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('postId', '==', req.params.postId)
        .limit(1)
    const postDoc = db.doc(`/posts/${req.params.postId}`)
    let postData
    postDoc.get()
        .then(doc => {
            if (doc.exists) {
                postData = doc.data()
                postData.postId = doc.id
                return likeDoc.get()
            } else {
                return res.status('404').json({ message: "Post not found" })
            }
        })
        .then(data => {
            if (!data.empty) {
                return db.doc(`/likes/${data.docs[0].id}`)
                .delete()
                .then(() => {
                    postData.likes--
                    return postDoc.update({likes: postData.likes})
                })
                .then(() => {
                    res.json(postData)
                })            
            } else {
                return res.status('400').json({ message: "Post already unliked" })
            }
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({error: err.code})
        })
}
exports.deletePost = (req, res) => {
    let postDoc = db.doc(`/posts/${req.params.postId}`)
    postDoc.get()
        .then(doc => {
            if (!doc.exists) return res.status('400').json({ message: "Post not found" })
            if (doc.data().userHandle !== req.user.handle) return res.status('403').json({ message: "unauthorized" })
            else return postDoc.delete()
        })
        .then(() => {
            res.json({ message: "post deleted" })
        })
        .catch(err => {
            console.error(err)
            res.status(500).json({error: err.code})
        }) 
    
}