class TabManager {
    constructor() {
        this.activeTab = 'sensor-data';
        this.initializeTabSystem();
    }

    initializeTabSystem() {
        // Add event listeners for tab buttons
        document.addEventListener('DOMContentLoaded', () => {
            this.setupTabButtons();
            this.showTab(this.activeTab);
        });
    }

    setupTabButtons() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        // Remove active class from all buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Show selected tab content
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Activate corresponding button
        const selectedButton = document.querySelector(`[onclick*="${tabName}"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }

        this.activeTab = tabName;

        // Trigger tab-specific initialization
        this.onTabSwitch(tabName);
    }

    onTabSwitch(tabName) {
        // Notify other components about tab switch
        if (window.mixerApp) {
            window.mixerApp.onTabSwitch(tabName);
        }
        
        if (window.beatMaker) {
            window.beatMaker.onTabSwitch(tabName);
        }

        // Emit custom event for tab switch
        const tabSwitchEvent = new CustomEvent('tabSwitch', {
            detail: { tabName, previousTab: this.activeTab }
        });
        document.dispatchEvent(tabSwitchEvent);
    }

    getCurrentTab() {
        return this.activeTab;
    }
}

// Global tab switching function for onclick handlers
function switchTab(tabName) {
    if (window.tabManager) {
        window.tabManager.switchTab(tabName);
    }
}

// Initialize tab manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tabManager = new TabManager();
});