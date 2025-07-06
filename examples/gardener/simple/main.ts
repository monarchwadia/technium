import path from "path";
import { Gardener } from "@technium/gardener-core";

const main = async () => {
    const gardener = new Gardener({
        src: {
            assetsDir: path.join(__dirname, "assets"),
            contentDir: path.join(__dirname, "content")
        },
        dist: path.join(__dirname, "dist"),
    })
    
    gardener.publish();
}

main().then(() => {
    console.log("Gardener has finished processing.");
}).catch(err => {
    console.error("Error during Gardener processing:", err);
});