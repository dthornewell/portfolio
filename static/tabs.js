document.addEventListener("DOMContentLoaded", function() {
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".nav-link");

    const observerOptions = {
        threshold: 0.6 // Adjusts when a section is considered in view (60%)
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const linkId = `link-${entry.target.id}`;
            const link = document.getElementById(linkId);

            if (entry.isIntersecting) {
                navLinks.forEach(link => link.classList.remove("active"));
                link.classList.add("active");
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
});


function flipCard(card, event) {
    // Check if the click was on the carousel controls or inner elements
    const clickedElement = event.target;

    // If the clicked element is a carousel control or inside the carousel, do not flip
    if (clickedElement.closest('.carousel') || clickedElement.closest('.carousel-control-next') || clickedElement.closest('.carousel-control-prev')) {
        return; // Stop flipping when clicking inside the carousel
    }

    // Toggle the flip class when clicked outside the carousel
    card.classList.toggle('flipped');
}