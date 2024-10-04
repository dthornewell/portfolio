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
