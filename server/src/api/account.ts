import express from "express";
import DB from "../db_handler.js";

const Router = express.Router();
Router.use(express.json());


Router.get("/get-username", async (req, res) => {
    if (res.locals.userid) {
        const usrename = await DB.getUsername(res.locals.userid);
        res.status(200).json({ username: usrename });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

Router.get("/get-name", async (req, res) => {
    if (res.locals.userid) {
        const name = await DB.getName(res.locals.userid);
        res.status(200).json({ name: name });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

Router.post("/change-password", async (req, res) => {
    try {
        if (res.locals.userid) {
            const { oldPassword, newPassword } = req.body;
            
            if (!oldPassword || !newPassword) {
                res.status(400).json({ error: "Missing old or new password" });
                return;
            }

            // need to wait for the encrption of password
            const result = await DB.changePassword(res.locals.userid, oldPassword, newPassword);
            if (result) {
                res.status(200).json({ message: "Successfully changed password" });
            } else {
                res.status(401).json({ error: "Old password is incorrect" });
            }
        } else {
            res.status(401).json({ error: "No valid sessionid or username" });
        }
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

Router.post("/change-name", async (req, res) => {
    if (res.locals.userid){
        const {newName} = req.body;
        if (!newName) {
            res.status(401).json({error: "Do not have required attribute"});
        }else {
            const result = await DB.changeName(res.locals.userid, newName);
            if (!result) {
                res.status(500).json({error: "Database error"});
            }else {
                res.status(200).json({message: "Successfully changed name"});
            }
        }
    }else {
        res.status(500).json({error: "Internal server error"});
    }
});

Router.post("/change-username", async (req, res) => {
    if (res.locals.userid) {
        const {newUsername} = req.body;
        if (!newUsername) {
            res.status(401).json({error: "Do not have new username"});
        }else {
            const result = await DB.changeUsername(res.locals.userid, newUsername);
            if (result) {
                res.cookie("username", newUsername, {
                    httpOnly: true,
                    secure: false,
                })
                res.status(200).json({ message: "Successfully changed username" });
            }else{
                res.status(500).json({ error: "Cannot change username due to database error" })
            }
        }
    }else {
        res.status(500).json({error: "Do not have userid"});
    }
});

export default Router;
