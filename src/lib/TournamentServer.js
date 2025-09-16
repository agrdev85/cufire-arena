const API_URL = "http://localhost:4000/api/tournaments";

const listTournaments = async () => {
    return await fetch(API_URL);
};
