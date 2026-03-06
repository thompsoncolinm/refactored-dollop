const navController = {
    init() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('before:hidden');
            navMenu.classList.toggle('hidden');
        });
        const navButton = navMenu.querySelectorAll('.nav-button');
        navButton.forEach((button) => {
            button.addEventListener('click', () => {
                button.classList.add('active-menu');
                navButton.forEach((button) => {
                    if (!button.classList.contains('active-menu')){
                        button.nextElementSibling.classList.add('hidden');
                    }
                });
                button.classList.remove('active-menu');
                const navDropdown = button.nextElementSibling;
                navDropdown.classList.toggle('hidden');
                navDropdown.style.marginBottom = -navDropdown.offsetHeight+'px';
                navDropdown.style.marginLeft = -navDropdown.offsetWidth/2+'px';
                navDropdown.style.marginRight = -navDropdown.offsetWidth/2+'px';
            });
        });
    }
}
addEventListener('DOMContentLoaded', () => {
    navController.init();
});

