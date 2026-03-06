const headerAdjust = {
    init() {
        const header = document.querySelector('header');
        const headerHeight = header.clientHeight;
        const main = document.querySelector('main');
        main.style.paddingTop = `calc(${headerHeight}px + 2rem)`;
    }
}
addEventListener('DOMContentLoaded', () => {
    headerAdjust.init();
});