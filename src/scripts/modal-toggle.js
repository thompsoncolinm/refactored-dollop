const modalController = {
    init () {
        const modalBtns = document.querySelectorAll('.modal-btn');

        modalBtns.forEach((button) => {
            const targetId = button.getAttribute('data-target');
            const target = document.querySelector(`#${targetId}`) ;
            button.addEventListener('click', () => {
                target.classList.remove('hidden');
            })
            const closeBtn = document.querySelector(`#${targetId} > .modal-content > .close`);
            console.log(closeBtn)
            closeBtn.addEventListener('click', () => {
                target.classList.add('hidden');
            })
            const underlay = document.querySelector(`#${targetId} > .modal-underlay`);
            underlay.addEventListener('click', (event) => {
                target.classList.add('hidden');
            })
        });


    }
}
addEventListener('DOMContentLoaded', () => {
    modalController.init();
});