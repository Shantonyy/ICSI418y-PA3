require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.MONGO_URI);

async function connectDatabase() 
{
    try 
    {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) 
    {
        console.error("Could not connect to MongoDB");
        console.error(error);
    }
}
connectDatabase();

app.get("/", (req, res) => 
    {
    res.json({ message: "Server is running" });
});

app.post("/signup", async (req, res) => 
    {
    try 
    {
        const { f_name, l_name, username, password } = req.body;

        if (!f_name || !l_name || !username || !password) {
            return res.status(400).json({ message: "Required information is missing" });
        }

        const db = client.db("pa2");
        const users = db.collection("users");

        const existing = await users.findOne({ username });
        if (existing) {
            return res.status(409).json({ message: "Username already exists" });
        }

        await users.insertOne({ f_name, l_name, username, password });

        return res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.post("/login", async (req, res) =>
    {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Required information is missing" });
        }

        const db = client.db("pa2");
        const users = db.collection("users");

        const user = await users.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "Username does not exist" });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        return res.status(200).json({ message: "Login successful" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/users", async (req, res) => {
    try {
        const db = client.db("pa2");
        const users = db.collection("users");
        const userList = await users.find({}).toArray();
        return res.status(200).json(userList);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.post("/api/projects", async (req, res) => {
    try {
        const { name, description, status, project_lead_id } = req.body;

        if (!name || !description || !status || !project_lead_id) {
            return res.status(400).json({ message: "Required fields are missing" });
        }

        if (!ObjectId.isValid(project_lead_id)) {
            return res.status(400).json({ message: "Invalid project lead ID" });
        }

        const db = client.db("pa2");
        const users = db.collection("users");
        const projects = db.collection("projects");
        const memberships = db.collection("project_memberships");

        const leadUser = await users.findOne({ _id: new ObjectId(project_lead_id) });
        if (!leadUser) {
            return res.status(404).json({ message: "Project lead user not found" });
        }

        const projectResult = await projects.insertOne({
            name,
            description,
            status,
            project_lead_id: new ObjectId(project_lead_id)
        });

        const projectId = projectResult.insertedId;

        await memberships.insertOne({
            project_id: projectId,
            user_id: new ObjectId(project_lead_id)
        });

        return res.status(201).json({ message: "Project created successfully", projectId });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/projects", async (req, res) => {
    try {
        const db = client.db("pa2");
        const projects = db.collection("projects");
        const projectList = await projects.find({}).toArray();
        return res.status(200).json(projectList);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/projects/:projectId/members", async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({ message: "Invalid project ID" });
        }

        const db = client.db("pa2");
        const projects = db.collection("projects");
        const memberships = db.collection("project_memberships");

        const project = await projects.findOne({ _id: new ObjectId(projectId) });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const membershipList = await memberships.find({ project_id: new ObjectId(projectId) }).toArray();
        return res.status(200).json(membershipList);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.post("/api/projects/:projectId/members", async (req, res) => {
    try {
        const { projectId } = req.params;
        const { user_id } = req.body;

        if (!ObjectId.isValid(projectId) || !ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: "Invalid project ID or user ID" });
        }

        const db = client.db("pa2");
        const projects = db.collection("projects");
        const users = db.collection("users");
        const memberships = db.collection("project_memberships");

        const project = await projects.findOne({ _id: new ObjectId(projectId) });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const user = await users.findOne({ _id: new ObjectId(user_id) });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const existingMembership = await memberships.findOne({
            project_id: new ObjectId(projectId),
            user_id: new ObjectId(user_id)
        });

        if (existingMembership) {
            return res.status(409).json({ message: "User is already a member of this project" });
        }

        await memberships.insertOne({
            project_id: new ObjectId(projectId),
            user_id: new ObjectId(user_id)
        });

        return res.status(201).json({ message: "Member added successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.delete("/api/projects/:projectId/members/:userId", async (req, res) => {
    try {
        const { projectId, userId } = req.params;

        if (!ObjectId.isValid(projectId) || !ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid project ID or user ID" });
        }

        const db = client.db("pa2");
        const projects = db.collection("projects");
        const memberships = db.collection("project_memberships");

        const project = await projects.findOne({ _id: new ObjectId(projectId) });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (project.project_lead_id.equals(new ObjectId(userId))) {
            return res.status(400).json({ message: "Cannot remove project lead" });
        }

        const result = await memberships.deleteOne({
            project_id: new ObjectId(projectId),
            user_id: new ObjectId(userId)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Membership not found" });
        }

        return res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.listen(9000, () => 
    {
    console.log("Server running on port 9000");
});