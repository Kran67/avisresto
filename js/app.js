import { GoogleMap } from "./map.js";
import { Xhr } from "./xhr.js";

class App {
    static get ADDRESTAURANT() { return 0; }
    static get ADDCOMMENT() { return 1; }
    /**
     * create instance.
     * @param {Number} restaurantPerPage Number of visible restaurants in result column
     * @param {String} apiKey The google API key
     */
    constructor(restaurantPerPage, apiKey) {
        this.googleMap = new GoogleMap(this);
        this.attachEvents();
        this.numPerPage = restaurantPerPage;
        this.APIKey = apiKey;
        this.currentRestaurant = null;
    }
    /**
     * Initialize the autocomplete
     * @method
     * @name App.autocomplete
     */
    autocomplete() {
        const input = document.getElementById('searchboxinput');
        const autocomplete = new google.maps.places.Autocomplete(input);

        autocomplete.addListener('place_changed', function () {
            let position = null;
            const place = autocomplete.getPlace();
            if (place) {
                if (!document.getElementById("comments").classList.contains("hidden")) {
                    app.hideCommentsPanel();
                }
                position = place.geometry.location;
                app.googleMap.marker.setMap(null);
                app.googleMap.marker = app.googleMap.createMaker(position, place.formatted_address, "../images/pin.png");
                app.googleMap.map.setCenter(position);
                app.googleMap.map.setZoom(13);
                app.googleMap.resetFilters();
                app.googleMap.cluster.clearMarkers();
                app.googleMap.findRestaurants(position, place.formatted_address.includes("paris"));
            }
        });
    }
    /**
     * Attach all events
     * @method
     * @name App.attachEvents
     */
    attachEvents() {
        document.getElementById("plan").addEventListener("click", event => {
            this.googleMap.map.setMapTypeId('terrain');
            event.target.classList.toggle("hidden");
            event.target.nextElementSibling.classList.toggle("hidden");
        });
        document.getElementById("satellite").addEventListener("click", event => {
            this.googleMap.map.setMapTypeId('satellite');
            event.target.classList.toggle("hidden");
            event.target.previousElementSibling.classList.toggle("hidden");
        });
        document.getElementById("filterRating").addEventListener("click", event => {
            document.getElementById("ratingfilters").classList.toggle("hidden");
        });
        document.querySelectorAll(".ratingItem").forEach(menuItem => {
            menuItem.addEventListener("mousedown", event => {
                const filterRating = document.getElementById("filterRating");
                let elem = event.target;
                while (!elem.dataset.index) {
                    elem = elem.parentNode;
                }
                document.getElementById("results").classList.toggle("searching");
                document.getElementById("ratingfilters").classList.toggle("hidden");
                app.googleMap.filterRating = parseFloat(elem.dataset.index);
                if (app.googleMap.filterRating > -1) {
                    filterRating.firstElementChild.innerHTML = `${elem.dataset.index}+`;
                    filterRating.firstElementChild.nextElementSibling.classList.remove("hidden");
                    filterRating.classList.add("selected");
                } else {
                    filterRating.firstElementChild.innerHTML = "Note";
                    filterRating.firstElementChild.nextElementSibling.classList.add("hidden");
                    filterRating.classList.remove("selected");
                }
                app.googleMap.page = 1;
                app.googleMap.renderHTML();
                event.cancelBubble = true;
                event.stopPropagation();
            });
        });
        document.addEventListener("mousedown", () => {
            const rf = document.getElementById("ratingfilters");
            if (!rf.classList.contains("hidden")) {
                rf.classList.add("hidden");
            }
        });
        document.getElementById("order").addEventListener("click", () => {
            const map = app.googleMap;
            const orderDiv = document.getElementById("order").lastElementChild;
            if (!map.resultOrderDesc) {
                map.resultOrderDesc = true;
            } else {
                map.resultOrderDesc = !map.resultOrderDesc;
            }
            orderDiv.className = `dropdown-icon ${map.resultOrderDesc == undefined ? "arrow-up-down" : map.resultOrderDesc ? "arrow-down" : "arrow-up"}`;
            document.getElementById("results").classList.toggle("searching");
            map.renderHTML();
        });
        document.getElementById("btnPrevPage").addEventListener("click", () => {
            app.googleMap.page--;
            if (app.googleMap.page < 1) {
                app.googleMap.page = 1;
            }
            document.getElementById("results").classList.toggle("searching");
            app.googleMap.renderHTML();
        });
        document.getElementById("btnNextPage").addEventListener("click", () => {
            // ~~ récupère la partie entière d'un nombre ou la valeur numérique d'une chaine sinon retourne 0
            const maxPage = ~~document.getElementById("maxPages").innerText;
            app.googleMap.page++;
            if (app.googleMap.page > maxPage) {
                app.googleMap.page = maxPage;
            }
            document.getElementById("results").classList.toggle("searching");
            app.googleMap.renderHTML();
        });
        document.getElementById("btnAdd").addEventListener("click", () => {
            // ~~ récupère la partie entière d'un nombre ou la valeur numérique d'une chaine sinon retourne 0
            if (~~document.querySelector(".glass").dataset.mode === App.ADDRESTAURANT) {
                app.googleMap.addNewRestaurant();
            } else {
                app.currentRestaurant.addComment();
            }
        });
        document.getElementById("btnCancel").addEventListener("click", () => {
            app.hideModal();
        });
        document.getElementById("backBtn").addEventListener("click", () => {
            app.hideCommentsPanel();
        });
        document.getElementById("addCommentBtn").addEventListener("click", () => {
            document.querySelector(".glass").dataset.mode = App.ADDCOMMENT;
            app.showModal();
        });
        document.getElementById("commentsFirstImg").addEventListener("click", () => {
            app.googleMap.panorama.setPosition(app.currentRestaurant.location);
            document.getElementById("pano").classList.toggle("hidden");
        });
    }
    /**
     * Show the modal window
     * @method
     * @name App.showModal
     * @param {Object} data the data
     */
    showModal(data) {
        const lat = data ? data.latLng.lat() : app.currentRestaurant.lat;
        const lng = data ? data.latLng.lng() : app.currentRestaurant.lng;
        document.getElementById("pano").classList.add("hidden");
        document.querySelector(".glass").classList.toggle("hidden");
        document.querySelector(".glass").dataset.lat = lat;
        document.querySelector(".glass").dataset.lng = lng;
        if (data) {
            Xhr.load({
                url: `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${app.APIKey}`,
                async: true,
                callback: (data) => {
                    data = JSON.parse(data);
                    document.querySelector(".glass").dataset.address = data.results[0].formatted_address;
                },
                xml: false
            });
        }
        document.querySelectorAll(".addingRestaurant").forEach(item => {
            item.classList.remove("hidden");
            if (!data) {
                item.classList.add("hidden");
            }
        });
        document.querySelectorAll(".addingComment").forEach(item => {
            item.classList.add("hidden");
            if (!data) {
                item.classList.remove("hidden");
            }
        });
        if (!data) {
            document.getElementById("name").disabled = true;
            document.getElementById("name").value = app.currentRestaurant.name;
            document.getElementById("name").nextElementSibling.classList.add("active");
            document.querySelector(".title").innerHTML = "Ajouter un commentaire";
        } else {
            document.getElementById("name").nextElementSibling.classList.remove("active");
            document.querySelector(".title").innerHTML = "Ajouter un restaurant";
            document.getElementById("name").disabled = false;
            document.getElementById("name").value = "";
        }
    }
    /**
     * Hide the modal window
     * @method
     * @name App.hideModal
     */
    hideModal() {
        document.querySelector(".glass").classList.toggle("hidden");
        document.querySelector(".glass").dataset.lat = null;
        document.querySelector(".glass").dataset.lng = null;
        app.resetModalFields();
    }
    /**
     * Reset all field of the modal window
     * @method
     * @name App.resetModalFields
     */
    resetModalFields() {
        document.getElementById("name").value = null;
        document.getElementById("comment").value = null;
        for (let i = 1; i < 5; i++) {
            document.getElementById(`star${i}`).checked = false;
            document.getElementById(`star${i}half`).checked = false;
        }
        document.getElementById("star5").checked = false;
        document.getElementById("starhalf").checked = false;
    }
    /**
     * Show the comments panel
     * @method
     * @name App.showCommentsPanel
     * @param {Restaurant} restaurant the restaurant ref
     */
    showCommentsPanel(restaurant) {
        let color = "red";
        const marker = app.googleMap.cluster.markers_.filter(e => e.position.lat() === restaurant.location.lat && e.position.lng() === restaurant.location.lng);
        if (marker.length > 0) {
            marker[0].setAnimation(null);
        }
        document.getElementById("commentsList").innerHTML = "";
        document.querySelector(".filters").classList.toggle("hidden");
        document.getElementById("results").classList.toggle("hidden");
        document.getElementById("comments").classList.toggle("hidden");
        document.querySelector(".commentsTitle").innerHTML = restaurant.name;
        document.querySelector(".omnibox").classList.toggle("viewComments");
        document.querySelector(".toolbar").classList.toggle("hidden");
        document.getElementById("commentsFirstImg").src = `https://maps.googleapis.com/maps/api/streetview?size=384x240&location=${restaurant.location.lat},${restaurant.location.lng}&fov=80&heading=70&pitch=0&key=${app.APIKey}`;
        const rating_score = document.querySelector(".commentsHeaderTitle .cards-rating-score");
        rating_score.innerHTML = restaurant.rating;
        rating_score.classList.remove("red", "yellow", "green", "lime", "orange");
        // ~~ récupère la partie entière d'un nombre ou la valeur numérique d'une chaine sinon retourne 0
        switch (~~restaurant.rating) {
            case 2:
                color = "orange";
                break;
            case 3:
                color = "yellow";
                break;
            case 4:
                color = "lime";
                break;
            case 5:
                color = "green";
                break;
        }
        rating_score.classList.add(color);
        const ratings = document.querySelectorAll(".commentsHeaderTitle .cards-rating-star");
        ratings.forEach((rating, idx) => {
            rating.classList.remove("red", "yellow", "green", "lime", "orange");
            rating.classList.add(color);
            rating.classList.add("cards-rating-star-empty");
            // ~~ récupère la partie entière d'un nombre ou la valeur numérique d'une chaine sinon retourne 0
            if (idx < ~~restaurant.rating) {
                rating.classList.remove("cards-rating-star-empty");
            }
        });
        document.querySelector(".commentsHeaderTitle .section-result-num-ratings").innerHTML = `(${restaurant.numRatings})`;
        document.querySelector(".commentsHeaderTitle .section-result-location").innerHTML = restaurant.address;
        document.querySelector(".commentsHeaderTitle .section-result-opening-hours").innerHTML = restaurant.openedHours;
        restaurant.renderAllComments();
        app.googleMap.map.setCenter(restaurant.location);
        app.googleMap.map.setZoom(20);
    }
    /**
     * Hide the comments panel
     * @method
     * @name App.hideCommentsPanel
     */
    hideCommentsPanel() {
        document.getElementById("pano").classList.add("hidden");
        document.querySelector(".filters").classList.toggle("hidden");
        document.getElementById("results").classList.toggle("hidden");
        document.getElementById("comments").classList.toggle("hidden");
        document.querySelector(".omnibox").classList.toggle("viewComments");
        document.getElementById("commentsList").innerHTML = "";
        document.querySelector(".toolbar").classList.toggle("hidden");
        app.currentRestaurant = null;
    }
    /**
     * Get the decimal part
     * @method 
     * @name App.getDecimalPart
     * @param {Number} decimal the number
     * @param {Array} ratingArray the rating array
     * @param {Number} row the index in the array
     * @param {String} color the color string
     */
    getDecimalPart(decimal, ratingArray, row, color) {
        if (decimal >= 0.5) {
            ratingArray[row] += ` cards-rating-star-half ${color}`;
        }
    }
}
/**
 * Add event when the document is loaded
 */
document.addEventListener("DOMContentLoaded", () => {
    window.app = new App(10, 'your google API key');
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${app.APIKey}&libraries=places&callback=app.googleMap.init`;
    script.defer = true;
    script.async = true;
    document.body.appendChild(script);
});
/**
 * @exports 
 */
export { App };
