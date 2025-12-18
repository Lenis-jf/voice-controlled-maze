import React, { useRef, useEffect, useState } from "react";

const Menu = ({isOpen, onClose}) => {
    const mainBurgerContainerRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        console.log("Toggling menu");
        console.log("Menu is currently:", menuOpen ? "Open" : "Closed");

        setMenuOpen(prev => !prev);

        if(menuOpen) {
            mainBurgerContainerRef.current.classList.remove("open");
            mainBurgerContainerRef.current.classList.add("closed");
        } else {
            mainBurgerContainerRef.current.classList.remove("closed");
            mainBurgerContainerRef.current.classList.add("open");
        }
    }

    return (
        <div className="menu closed" ref={mainBurgerContainerRef} onClick={toggleMenu}>
            <div className="burger-container">
                <div className="burger-line"></div>
                <div className="burger-line middle-line"></div>
                <div className="burger-line"></div>
            </div>
        </div>
    );
};

export default Menu;