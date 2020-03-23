import { Restaurant } from "./restaurant.js";
import { Xhr } from "./xhr.js";
import { App } from "./app.js";

/**
 * Fichier : map.js
 * Class for the googleMap
 */
class GoogleMap {
    /**
     * create GoogleMap instance
     * @param {App} app the application
     */
    constructor(app) {
        this.app = app;
        this.map = "";
        this.placeService = "";
        this.infoWindow = null;
        this.restaurants = [];
        this.numRestaurants = 0;
        this.page = 1;
        this.filterRating = -1;
        this.marker = null;
        this.cluster = null;
        this.resultOrderDesc = null;
    }
    /**
     * Initialise the map
     * @method
     * @name GoogleMap.init
     */
    init() {
        this.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 13
        });
        this.panorama = new google.maps.StreetViewPanorama(
            document.getElementById('pano'), {
            pov: {
                heading: 34,
                pitch: 10
            }
        });
        this.map.setStreetView(this.panorama);
        this.geolocation();
        this.placeService = new google.maps.places.PlacesService(this.map);
        this.app.autocomplete();
        google.maps.event.addListener(this.map, 'click', (data) => {
            document.querySelector(".glass").dataset.mode = App.ADDRESTAURANT;
            app.showModal(data);
        });
        this.cluster = new MarkerClusterer(this.map, []);
        this.map.addListener('zoom_changed', () => {
            app.googleMap.restaurants.forEach(r => {
                if (r.infoWindow) {
                    r.infoWindow.close();
                }
            });
        });
    }
    /**
     * Get the user location
     * @method
     * @name GoogleMap.geolocation
     */
    geolocation() {
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                this.setUserPosition(pos);
            }, () => {
                this.handleLocationError();
            }, {
                maximumAge: 600000,
                enableHighAccuracy: true
            });
        } else {
            // Browser doesn't support Geolocation
            this.handleLocationError();
        }
    }
    /**
     * Handle all errors
     * @method
     * @name GoogleMap.handleLocationError
     */
    handleLocationError() {
        let position = prompt("Votre localisation n'a pas pu être trouvée.\nVeuillez entrer une ville pour que nous puissions vous géolocaliser correctement.");
        if (!position) {
            position = "Paris";
        }
        position = position.replace(/ /g, "+"); // On formate l'entrée utilisateur pour passer correctement dans le lien
        Xhr.load({
            url: `https://maps.googleapis.com/maps/api/geocode/json?address=${position}&key=${app.APIKey}`,
            async: true,
            callback: this.findCity,
            xml: false
        });
    }
    /**
     * Find a position of the city name
     * @method
     * @name GoogleMap.findCity
     * @param {String} response the response of GeoCode API
     */
    findCity(response) { // Callback de gestionErreur récupérant les données envoyées par Geocode
        response = JSON.parse(response);
        if (response.status === google.maps.places.PlacesServiceStatus.OK) {
            app.googleMap.setUserPosition(response.results[0].geometry.location, response.results[0].formatted_address.includes("Paris"));
        } else {
            app.googleMap.handleLocationError();
        }
    }
    /**
     * Center the map to the location
     * @method
     * @name GoogleMap.setUserPosition
     * @param {Object} pos  The position object
     * @param {Number} pos.lat  The latitude
     * @param {Number} pos.lng  The longitude
     * @param {Boolean} loadJson  Indicate if we need to load the json file
     */
    setUserPosition(pos, loadJson) {
        this.map.setCenter(pos);
        this.marker = this.createMaker(pos, "Vous êtes ici", '../images/pin.png');
        this.findRestaurants(pos, loadJson);
    }
    /**
     * Find restaurants
     * @method
     * @name GoogleMap.findRestaurants
     * @param {Object} pos Map coords
     * @param {Object} pos.lat latitude
     * @param {Object} pos.lng longitude
     * @param {Boolean} loadJson indicate if load the JSON file
     */
    findRestaurants(pos, loadJson) {
        const results = document.getElementById("results");
        results.classList.toggle("searching");
        this.cluster.clearMarkers();
        this.restaurants.forEach(r => {
            r.destroy();
        });
        this.numRestaurants = this.restaurants.length = 0;
        if (loadJson) {
            Xhr.load({
                url: "js/restaurants.json",
                async: true,
                callback: this.JSONLoaded,
                xml: false,
                parameters: { pos: pos }
            });
        } else {
            this.placeService.nearbySearch({
                location: pos,
                radius: 500,
                type: ['restaurant']
            }, this.restaurantLoaded);
        }
    }
    /**
     * Call when the json is loaded
     * @method
     * @name GoogleMap.JSONLoaded
     * @param {Object} result the result
     * @param {Object} params the parameters
     */
    JSONLoaded(result, params) {
        if (result) {
            result = JSON.parse(result);
            result.forEach(res => {
                app.googleMap.createRestaurant(res);
            });
            app.googleMap.placeService.nearbySearch({
                location: params.pos,
                radius: 500,
                type: ['restaurant']
            }, app.googleMap.restaurantLoaded);
        }
    }
    /**
     * Get the restaurant results
     * @name GoogleMap.restaurantLoaded
     * @param {Object} results the result
     * @param {Number} status the request status
     */
    restaurantLoaded(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            app.googleMap.numRestaurants = results.length;
            results.forEach(result => {
                app.googleMap.placeService.getDetails({
                    placeId: result.place_id,
                    fields: ['name', 'rating', 'user_ratings_total', 'opening_hours', 'photo', 'place_id', 'formatted_address', 'type',
                        'geometry', 'review']
                },
                    (res) => {
                        app.googleMap.createRestaurant(res);
                    });
            });
        }
    }
    /**
     * Create a restaurant
     * @name GoogleMap.createRestaurant
     * @param {Object} result the result
     */
    createRestaurant(result) {
        if (result) {
            if (result.rating && result.user_ratings_total || result.ratings) {
                const restaurant = new Restaurant(this, result);
                // on test si le restaurant n'est pas déjà dans la liste
                const exist = this.restaurants.some(e => e.location.lat === restaurant.location.lat && e.location.lng === restaurant.location.lng);
                if (!exist) {
                    this.restaurants.push(restaurant);
                    this.cluster.addMarker(this.createMaker(restaurant.location, restaurant.name, "../images/restaurant_pinlet.png"));
                } else {
                    restaurant.destroy();
                }
            }
        }
        this.numRestaurants--;
        if (this.numRestaurants === 0) {
            this.renderHTML();
        }
    }
    /**
     * Render the html of the restaurant
     * @method
     * @name GoogleMap.renderHTML
     */
    renderHTML() {
        const numPerPage = app.numPerPage;
        const start = (this.page - 1) * numPerPage;
        let end = start + numPerPage;
        const results = document.getElementById("results");
        // ... syntaxe de décomposition, permet d'étendre un itérable (par exemple une expression de tableau ou une chaîne de caractères) en lieu et place de plusieurs arguments (pour les appels de fonctions) ou de plusieurs éléments (pour les littéraux de tableaux) ou de paires clés-valeurs (pour les littéraux d'objets).
        let restaurants = [...this.restaurants];
        if (this.filterRating !== -1) {
            restaurants = this.restaurants.filter(e => e.rating >= this.filterRating);
        }
        if (this.resultOrderDesc != undefined) {
            if (this.resultOrderDesc) {
                restaurants.sort((a, b) => a.rating - b.rating);
            } else {
                restaurants.sort((a, b) => b.rating - a.rating);
            }
        }
        results.innerHTML = "";
        results.classList.toggle("searching");
        if (end > restaurants.length) {
            end = restaurants.length;
        }
        for (let i = start; i < end; i++) {
            restaurants[i].renderHTML();
        }
        document.getElementById("maxPages").innerHTML = Math.ceil(restaurants.length / numPerPage);
        document.getElementById("page").innerHTML = this.page;

        document.getElementById("btnPrevPage").disabled = this.page === 1;
        document.getElementById("btnNextPage").disabled = restaurants.length - this.page * numPerPage <= 0;
    }
    /**
     * Create a marker
     * @method
     * @name GoogleMap.createMaker
     * @param {Object} pos map coords
     * @param {Number} pos.lat latitude
     * @param {Number} pos.lng longitude
     * @param {String} title the marker title
     * @param {String} icon the url of the icon
     * @returns {Marker} the marker
     */
    createMaker(pos, title, icon) {
        return new google.maps.Marker({
            position: pos,
            map: this.map,
            title: title,
            animation: google.maps.Animation.DROP,
            icon: icon
        });
    }
    /**
     * Add a new restaurant
     * @method 
     * @name GoogleMap.addNewRestaurant
     */
    addNewRestaurant() {
        const glass = document.querySelector(".glass");
        const name = document.getElementById("name").value;
        const address = glass.dataset.address;
        const comment = document.getElementById("comment").value;
        const pseudo = document.getElementById("pseudo").value;
        this.createRestaurant({
            restaurantName: name,
            address: address,
            lat: parseFloat(glass.dataset.lat),
            long: parseFloat(glass.dataset.lng),
            ratings: [
                {
                    stars: parseFloat(document.forms[0].rating.value),
                    comment: comment,
                    author_name: pseudo
                }
            ]
        });
        document.getElementById("results").classList.toggle("searching");
        this.renderHTML();
        app.hideModal();
        if (!document.getElementById("comments").classList.contains("hidden")) {
            app.hideCommentsPanel();
        }
    }
    /**
     * Reset filters
     * @method 
     * @name GoogleMap.resetFilters
     */
    resetFilters() {
        this.page = 1;
        this.filterRating = -1;
        this.resultOrderDesc = null;
    }
}
/**
 * @exports 
 */
export { GoogleMap };
