import { useState, useEffect } from "react";

function ProjectList({ onSelectProject }) {
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchProjects();
        fetchUsers();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await fetch("http://localhost:9000/api/projects");
            const data = await response.json();
            setProjects(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch("http://localhost:9000/api/users");
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const getLeadName = (project) => {
        const lead = users.find((user) => user._id === project.project_lead_id);
        return lead ? lead.username : "Unknown";
    };

    return (
        <div>
            <h2>Projects</h2>
            {projects.length === 0 ? (
                <p>No projects found</p>
            ) : (
                <ul>
                    {projects.map((project) => (
                        <li key={project._id}>
                            <strong>{project.name}</strong> - {project.status}
                            <br />
                            <small>{project.description}</small>
                            <br />
                            <small>Lead: {getLeadName(project)}</small>
                            <br />
                            <button onClick={() => onSelectProject(project)}>
                                View Members
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default ProjectList;
