export type GardenerConfig = {
    /**
     * Configurations for source directories.
     */
    src: {
        /**
         * The absolute path to the directory where your markdown and html files are located.
         */
        contentDir: string;
        /**
         * The absolute path to the directory where your assets (images, CSS, etc.) are located.
         */
        assetsDir: string;
    },
    /**
     * The absolute path to the directory where the output files will be generated. This will contain the root directory of your generated site.
     * Typically, this directory would be gitignored to avoid committing generated files, unless you have a specific reason to do so.
     */
    dist: string;
}
