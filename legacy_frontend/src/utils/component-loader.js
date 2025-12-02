/**
 * Component Loader Utility
 * Dynamically loads HTML components into the page
 */

class ComponentLoader {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
    }

    /**
     * Load a single component
     * @param {string} path - Path to the component HTML file
     * @param {string} targetSelector - CSS selector for the target element
     * @param {Function} callback - Optional callback after component is loaded
     * @returns {Promise<void>}
     */
    async loadComponent(path, targetSelector, callback = null) {
        try {
            // Get the target element
            const target = document.querySelector(targetSelector);
            if (!target) {
                console.error(`Target element not found: ${targetSelector}`);
                return;
            }

            // Check if we're already loading this component
            if (this.loadingPromises.has(path)) {
                await this.loadingPromises.get(path);
            } else {
                // Create a loading promise
                const loadPromise = this.fetchComponent(path);
                this.loadingPromises.set(path, loadPromise);
                await loadPromise;
                this.loadingPromises.delete(path);
            }

            // Get the cached HTML
            const html = this.cache.get(path);
            if (html) {
                target.innerHTML = html;

                // Execute callback if provided
                if (callback && typeof callback === 'function') {
                    callback(target);
                }
            }
        } catch (error) {
            console.error(`Error loading component ${path}:`, error);
        }
    }

    /**
     * Fetch component HTML from server
     * @param {string} path - Path to the component HTML file
     * @returns {Promise<void>}
     */
    async fetchComponent(path) {
        // Check cache first
        if (this.cache.has(path)) {
            return;
        }

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            this.cache.set(path, html);
        } catch (error) {
            console.error(`Failed to fetch component ${path}:`, error);
            throw error;
        }
    }

    /**
     * Load multiple components at once
     * @param {Array<{path: string, target: string, callback?: Function}>} components
     * @returns {Promise<void>}
     */
    async loadComponents(components) {
        const promises = components.map(({ path, target, callback }) =>
            this.loadComponent(path, target, callback)
        );
        await Promise.all(promises);
    }

    /**
     * Preload components without inserting them
     * @param {Array<string>} paths - Array of component paths to preload
     * @returns {Promise<void>}
     */
    async preloadComponents(paths) {
        const promises = paths.map(path => this.fetchComponent(path));
        await Promise.all(promises);
    }

    /**
     * Clear the component cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cached component HTML
     * @param {string} path - Path to the component
     * @returns {string|null}
     */
    getCached(path) {
        return this.cache.get(path) || null;
    }
}

// Create a global instance
window.componentLoader = new ComponentLoader();
