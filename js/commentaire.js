/**
 * Fichier : commentaire.js
 * Class for a comment
 */
class Commentaire {
    /**
     * create instance.
     * @param {Restaurant} restaurant restaurant ref
     * @param {Object} data data for the restaurant
     */
    constructor(restaurant, data) {
        this.authorName = data.author_name ? data.author_name  : "Inconnu";
        //this.authorUrl = data.author_url ? data.author_url : "";
        this.language = data.language ? data.language : "fr";
        this.profilePhotoUrl = data.profile_photo_url ? data.profile_photo_url : "/images/unknown.png";
        this.rating = data.rating ? data.rating : data.stars ? data.stars : null;
        this.relativeTimeDescription = data.relative_time_description ? data.relative_time_description : "Inconnu";
        this.text = data.text ? data.text : data.comment ? data.comment : "";
        this.restaurant = restaurant;
    }
    /**
     * render the comment
     * @method
     * @name Commentaire.renderHTML
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
        const template = `<div class="commentHeader">
                        <img class="commentHeaderProfileImg" src="${this.profilePhotoUrl}" alt="" />
                        <div class="commentHeaderProfile">
                            <div class="commentHeaderProfileName">${this.authorName}</div>
                        </div>
                    </div>
                    <div class="commentRating">
                        <ol class="cards-rating-stars">
                            <li class="${rating[0]}"></li>
                            <li class="${rating[1]}"></li>
                            <li class="${rating[2]}"></li>
                            <li class="${rating[3]}"></li>
                            <li class="${rating[4]}"></li>
                        </ol>
                        <span class="commentRatingTime">${this.relativeTimeDescription}</span>
                    </div>
                    <div class="commentText">${this.text.replace(/↵/g,"<br />")}</div>
                </div>`;
        const item = document.createElement("div");
        item.className = "comment";
        item.innerHTML = template;
        document.getElementById("commentsList").appendChild(item);
    }
}
/**
 * @exports 
 */
export { Commentaire };