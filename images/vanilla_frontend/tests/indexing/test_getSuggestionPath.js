const URL = "http://localhost:8200/getSuggestionPath"

async function getSuggestionPath(data) {
    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw Error(`Could not connect to the server: ${response.status}`)
        }

        const responseData = await response.json();
        return responseData;
    } catch (error) {
        console.error("ERROR:", error)
        return [];

    }
}

async function main() {
    const folders = ["Books"]
    const requestBody = {
        location: "LOCAL",
        identifier: "D:",
        uri: ["Books"]
    }

    const data = await getSuggestionPath(requestBody);
    console.log(data);
}

main()