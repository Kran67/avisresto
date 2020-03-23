import { Commentaire } from "./commentaire.js";
/**
 * Fichier : restaurant.js
 * Class for a restaurant
 */
class Restaurant {
    /**
     * Create  instance of Restaurant
     * @param {Map} map the map
     * @param {Object} data the data for the restaurant
     */
    constructor(map, data) {
        this.map = map;
        this.id = data.id;
        this.location = data.long && data.lat ? { lat: data.lat, lng: data.long } : data.geometry && data.geometry.location ? { lat: data.geometry.location.lat(), lng: data.geometry.location.lng() } : { lat: 0, lng: 0 };
        this.name = data.name ? data.name : data.restaurantName ? data.restaurantName : "Inconnu";
        this.address = data.formatted_address ? data.formatted_address : data.address ? data.address : "";
        this.rating = data.ratings ? data.ratings.reduce((pv, cv) => (pv.stars + cv.stars) / data.ratings.length) : data.rating ? data.rating : 0;
        this.photo = data.photos ? data.photos[0].getUrl({ 'maxWidth': 80, 'maxHeight': 92 }) : `https://maps.googleapis.com/maps/api/streetview?size=80x92&location=${this.location.lat},${this.location.lng}&fov=80&heading=70&pitch=0&key=${app.APIKey}`;
        this.commentsJson = data.commentsJson ? data.commentsJson : null;
        this.openHours = data.opening_hours && data.opening_hours.periods ? data.opening_hours.periods : [];
        this.numRatings = data.ratings ? data.ratings.length : data.user_ratings_total ? data.user_ratings_total : 0;
        this.placeId = data.place_id ? data.place_id : null;
        this.infoWindow = null;
        this.div = null;
        if (typeof this.rating === "object") {
            this.rating = this.rating.stars;
        }
        this.comments = [];
        const reviews = data.reviews?data.reviews : data.ratings;
        reviews.forEach(review => {
            this.comments.push(new Commentaire(this, review));
        });
        const date = new Date();
        const hours = date.getHours();
        const periods = this.openHours[date.getDay()];
        if (periods) {
            // c'est ouvert
            if (periods &&  periods.close && periods.close.hours>hours) {
                this.openedHours = `Ouvert jusqu'à ${periods.close.time.substring(0,2)}:${periods.close.time.substring(2,4)}`;
            } else {
                this.openedHours = "Fermé";
            }
        } else {
            this.openedHours = "Non communiqué";
        }
    }
    /**
     * Destroy all ref
     * @method
     * @name Restaurant.destroy
     */
    destroy() {
        this.map = this.id = this.location = this.name = this.address = this.rating = this.photo = this.commentsJson = this.openHours =
            this.numRatings = this.icon = /*this.marker = */null;
    }
    /**
     * Render the restaurant
     * @method
     * @name Restaurant.renderHTML
     */
    renderHTML() {
        const rating = new Array(5).fill("cards-rating-star cards-rating-star-empty");
        let i, color = "green";
        // ~~ récupère la partie entière d'un nombre ou la valeur numérique d'une chaine sinon retourne 0
        const max = ~~this.rating;
        const decimal = this.rating - max;
        switch (max) {
            case 1:
                color = "red";
                rating[0] = `cards-rating-star ${color}`;
                app.getDecimalPart(decimal, rating, max);
                break;
            case 2:
            case 3:
            case 4:
            case 5:
                switch (max) {
                    case 2:
                        color = "orange";
                        break;
                    case 3:
                        color = "yellow";
                        break;
                    case 4:
                        color = "lime";
                        break;
                }
                for (i = 0; i < max; i++) {
                    rating[i] = `cards-rating-star ${color}`;
                }
                if (max < 5) {
                    app.getDecimalPart(decimal, rating, max, color);
                }
                break;
        }
        const template = `
                <div class="itemContent">
                    <div class="itemContentText">
                        <h3>${this.name}</h3>
                        <div class="section-result-rating">
                            <span class="cards-rating-score ${color}">${this.rating}</span>
                            <ol class="cards-rating-stars">
                                <li class="${rating[0]}"></li>
                                <li class="${rating[1]}"></li>
                                <li class="${rating[2]}"></li>
                                <li class="${rating[3]}"></li>
                                <li class="${rating[4]}"></li>
                            </ol>
                            <span class="section-result-num-ratings">(${this.numRatings})</span>
                        </div>
                        <div class="section-result-details-container">
                            <span class="section-result-details">Restaurant</span>
                            <span class="section-result-separator">·</span>
                            <span class="section-result-location">${this.address}</span>
                        </div>
                        <div class="section-result-opening-hours">${this.openedHours}</div>
                    </div>
                    <div class="itemContentImg">
                        <img src="${this.photo}" width="80" height="90" alt="${this.name}" />
                    </div>
                </div>
            `;
        const item = document.createElement("div");
        item.className = "item";
        item.innerHTML = template;
        document.getElementById("results").appendChild(item);
        item.ref = this;
        this.infoWindow = new google.maps.InfoWindow({
            content: item.outerHTML,
            maxWidth: 400
        });
        item.addEventListener("mouseenter", event => {
            const ref = event.target.ref;
            const marker = ref.map.cluster.markers_.filter(e => e.position.lat().toFixed(5) === ref.location.lat.toFixed(5) && e.position.lng().toFixed(5) === ref.location.lng.toFixed(5));
            if (marker.length > 0) {
                marker[0].setAnimation(google.maps.Animation.BOUNCE);
                ref.infoWindow.setContent(this.div.outerHTML);
                ref.infoWindow.open(ref.map.map, marker[0]);
            }
        });
        item.addEventListener("mouseleave", event => {
            const ref = event.target.ref;
            const marker = ref.map.cluster.markers_.filter(e => e.position.lat().toFixed(5) === ref.location.lat.toFixed(5) && e.position.lng().toFixed(5) === ref.location.lng.toFixed(5));
            if (marker.length > 0) {
                marker[0].setAnimation(null);
            }
            ref.infoWindow.close();
        });
        item.addEventListener("click", event => {
            app.currentRestaurant = event.currentTarget.ref;
            app.showCommentsPanel(event.currentTarget.ref);
        });
        this.div = item;
    }
    /**
     * Render all the restaurant comments
     * @method
     * @name Restaurant.renderAllComments
     */
    renderAllComments() {
        this.comments.forEach(commentaire => {
            commentaire.renderHTML();
        });
    }
    /**
     * add a comment to the restaurant
     * @method
     * @name Restaurant.addComment
     */
    addComment() {
        const pseudo = document.getElementById("pseudo").value;
        const comment = document.getElementById("comment").value;
        document.getElementById("commentsList").innerHTML = "";
        this.comments.push(new Commentaire(this, {
            author_name:pseudo,
            rating:parseFloat(document.forms[0].rating.value),
            text:comment
        }));
        this.renderAllComments();
        app.hideModal();
    }
}
/**
 * @exports 
 */
export { Restaurant };