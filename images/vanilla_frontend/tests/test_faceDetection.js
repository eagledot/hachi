// GET folders list
const urls = {
    foldersList: "http://localhost:5000/api/getGroup/resource_directory",
    query: "http://localhost:5000/api/query",
    collectQueryMeta: "http://localhost:5000/api/collectQueryMeta",
    peopleList: "http://localhost:5000/api/getGroup/person"
}


// Function to get people list
async function getPeopleList() {
    const response = await fetch(urls.peopleList);
    return await response.json();
}

// Function to get folders list
async function getFoldersList() {
    const response = await fetch(urls.foldersList);
    return await response.json();
}

const data = await getFoldersList()

// Function to get a folder or person photos
async function getPhotos(queryString) {
    // First send query request
    const formData = new FormData();
    formData.append("query_start", true);
    formData.append("query", queryString);
    formData.append("page_size", 1000);

    const queryResponse = await fetch(urls.query, {
        method: "POST",
        body: formData
    });
    const queryData = await queryResponse.json();
    const { n_matches, n_pages, query_token } = queryData;

    const photos = []
    // Now send request to get request to fetch photos
    for (let i = 0; i <= n_pages - 1; i++) {
        const photoResponse = await fetch(`${urls.collectQueryMeta}/${query_token}/${i}`);
        const photoData = await photoResponse.json();
        photos.push(...photoData['meta_data']);
    }
    return photos;
}

function getFolderPhotosStats(data) {
    const stats = {
        uniquePeople: new Set()
    }

    for (const photo of data) {
        const personList = photo['person'];
        for (const person of personList) {
            stats.uniquePeople.add(person);
        }
    }

    return stats;
}

const foldersMetaData = {};


for (const folder of data) {
    const photos = await getPhotos(`resource_directory=${folder}`);
    foldersMetaData[folder] = photos;
    // console.log(getFolderPhotosStats(photos));
}


// Various analyses can be performed to test the face detection cluster



// For example to check how people from different folders are merged as a one person
const peopleList = await getPeopleList();
const uniqueFoldersForPeople = {};
for (const person of peopleList) {
    if (person === "no-categorical-info" || person === "no_person_detected") {
        continue;
    }
    const personPhotos = await getPhotos(`person=${person}`);
    // Loop through the person's photos
    const uniqueFolders = new Set();
    for (const photo of personPhotos) {
        const resource_hash = photo['resource_hash'];
        // Check through the folder metadata
        for (const folder in foldersMetaData) {
            const folderPhotos = foldersMetaData[folder];
            if (folderPhotos.some(p => p['resource_hash'] === resource_hash)) {
                uniqueFolders.add(folder.split('/').pop());
            }
        }
    }
    if (uniqueFolders.size > 1) {
        uniqueFoldersForPeople[person] = Array.from(uniqueFolders);
    }
}

console.log(uniqueFoldersForPeople);