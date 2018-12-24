const express = require("express");
const app = express();
const fs = require('fs');
const mongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/mydb";

//读取静态页面
var indexhtml = fs.readFileSync('./index.html').toString();
var signuphtml = fs.readFileSync('./signup.html').toString();
var resethtml = fs.readFileSync('./reset.html').toString();
var usercenterhtml = fs.readFileSync('./usercenter.html').toString();
var boardhtml = fs.readFileSync('./board.html').toString();

app.use(express.static('./pictures'));

//连接数据库
mongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
    let dbase = db.db("mydb");
    identity = dbase.collection("login");
    diaries = dbase.collection("diaries");
    ips = dbase.collection("ips");
})

app.get('/', (req, res) => {
    /*ipsearch(req.connection.remoteAddress).then((user) => {
        if (user) res.send(usercenterhtml.replace("欢迎， user !", '欢迎, ' + req.query.username + ' !'));
        elseres.send(indexhtml);
    })*/
    res.send(indexhtml);
})

//注册界面
app.get('/signup.html', (req, res) => {
    res.send(signuphtml);
})

//重置密码页面
app.get('/reset', (req, res) => {
    res.send(resethtml);
})

//我要吐槽界面
app.get('/board', (err, res) => {
    res.send(boardhtml);
})

//登录事件·
app.get('/log', (req, res) => {
    match(req.query).then((result) => {
        if (!result) {
            res.send(logerr("账号或密码错误"));
        } else {
            ipsetup(req.connection.remoteAddress, req.query.username).then((err) => {
                res.send(usercenterhtml.replace("欢迎， user !", '欢迎, ' + req.query.username + ' !'));
            }).catch((err) => {
                res.send(logerr(err));
            })
        }
    })
})

//注册事件
app.get('/signup', (req, res) => {

    match(req.query, true).then((result) => {
        if (result) throw "该用户名已被使用";
        formate(req.query.password);
        if (req.query.password != req.query.confirmpassword) throw "密码输入不一致";
        identity.insertOne({ username: req.query.username, password: req.query.password });
        res.send(indexhtml);
    }).catch((err) => {
        res.send(render(signuphtml, err));
    })
})

//发表吐槽事件
app.get('/boardcommit', (req, res) => {

})

//提交重置事件
app.get('/commit_reset', (req, res) => {
    reset();
    async function reset() {
        let user = await ipsearch(req.connection.remoteAddress);
        let result = await match({ username: user.username }, true);
        if (result.password != req.query.password)
            res.send(resethtml.replace("<p>新密码：", '<p style="color:#cc0000">原始密码有误</p>' + "<p>新密码："));
        else {
            try {
                formate(req.query.newpassword);
                if (req.query.newpassword != req.query.confirmpassword) throw "密码输入不一致";
                if (req.query.newpassword == result.password) throw "新密码不能与原密码相同";
                identity.updateOne(result, { $set: { _id: result._id, username: result.username, password: req.query.newpassword } });
                res.send(usercenterhtml.replace("欢迎， user !", '欢迎, ' + user + ' !'));
            } catch (err) {
                let replacement = '<input type="submit" name="log-in-button" value="确认修改">';
                res.send(resethtml.replace(replacement, `<p style="color:#cc0000">${err}</p>` + replacement));
            }
        }
    }
})


//退出登录事件
app.get('/quit', (req, res) => {
    ips.deleteOne({ ip: req.connection.remoteAddress });
    res.send(indexhtml);
})

//查询数据库
function match(mes, onlyName = false) {
    return new Promise((resolve, reject) => {
        if (!onlyName) {
            identity.find({ username: mes.username, password: mes.password }).toArray((err, records) => resolve(records[0]));
        } else {
            identity.find({ username: mes.username }).toArray((err, records) => resolve(records[0]));
        }
    })
}

//密码格式检查
function formate(string) {
    let flag = 1;
    if (string.length < 8 || string.length > 16) flag = 0;
    for (let a of string) {
        type = !(a >= 'a' && a <= 'z' || a >= 'A' && a <= 'Z' || a >= '0' && a <= '9' || a == '.' || a == '@');
        if (type) {
            flag = -1;
            break;
        }
    }
    if (flag == 0) throw "密码长度需为6~18个字符";
    else if (flag == -1) throw "密码只能包含字母、数字或 . @";
}

//注册失败后的页面
function render(html, tip) {
    replacement1 = `<p style="color:#cc0000">${tip}</p>` + '<input type="submit" name="log-in-button" value="完成注册">';
    html = html.replace('<input type="submit" name="log-in-button" value="完成注册">', replacement1);
    return html;
}


//检索用户是否已登录,若未登录则建立ip映射
function ipsetup(ip, username) {
    return new Promise((resolve, reject) => {
        ips.find({ $or: [{ username: username }, { ip: ip }] }).toArray((err, records) => {
            if (records[0]) reject("重复登录！")
            else {
                ips.insertOne({ ip: ip, username: username });
                resolve();
            }
        })
    })
}

//通过ip检索用户名
function ipsearch(ip) {
    return new Promise((resolve, reject) => {
        ips.find({ ip: ip }).toArray((err, records) => resolve(records[0]));
    })
}

//登录错误处理
function logerr(err) {
    let replaced = '<input type="submit" name="log-in-button" value="登录 ">';
    let replacement = `<p style="color:#cc0000">${err}</p>` + replaced; //登录错误
    return indexhtml.replace(replaced, replacement);
}

app.listen(8888, '192.168.0.118');