const axios = require("axios")

const SERPAPI = "https://serpapi.com/search.json"

const getPlaceDataId = async (query) => {
    try {
        const placeName = query.split('/place/')[1]?.split('/')[0];

        if (!placeName) {
            throw new Error("Invalid Google Maps URL or place name not found");
        }

        const res = await axios.get(SERPAPI, {
            params: {
                engine: "google_maps",
                q: placeName,  // Use extracted place name
                api_key: process.env.SERPAPI_KEY
            }
        });

        const place = res.data.place_results;

        if (!place || !place.data_id) {
            throw new Error("Place not found or missing data_id");
        }

        return place.data_id;
    } catch (error) {
        console.error('Error fetching place data:', error.message);
        throw new Error('Failed to get place data ID: ' + error.message);
    }
};

const getReviews = async (dataId, pageToken = null) => {
    let reviews = [];
    let nextPageToken = pageToken;

    try {
        const params = {
            engine: "google_maps_reviews",
            data_id: dataId,
            api_key: process.env.SERPAPI_KEY,
            next_page_token: nextPageToken,
        };

        const res = await axios.get(SERPAPI, { params });

        // Add reviews to the array
        if (Array.isArray(res.data.reviews)) {
            reviews = res.data.reviews;
        }

        nextPageToken = res.data.serpapi_pagination?.next_page_token || null;

        return { reviews, nextPageToken };

    } catch (error) {
        console.error('Error fetching reviews:', error.message);
        console.error('Error details:', error.response?.data); // Log error response from API
        throw new Error('Failed to fetch reviews: ' + error.message);
    }
};

module.exports = {
    getPlaceDataId,
    getReviews
}