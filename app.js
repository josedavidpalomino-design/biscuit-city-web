// =========================================================
// 1. CONEXIÓN A LA NUBE Y AUTENTICACIÓN (FIREBASE)
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// Nuevas herramientas para el Login
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBT_zil4JVWUm7sJHZ6nvh54FVG9fV2U20",
  authDomain: "biscuit-city.firebaseapp.com",
  projectId: "biscuit-city",
  storageBucket: "biscuit-city.firebasestorage.app",
  messagingSenderId: "144252328279",
  appId: "1:144252328279:web:c181865c2701a73b9f0612"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Activamos el vigilante de usuarios

let usuarioActual = null; // Guardará al usuario si está logueado

// =========================================================
// 2. CONTROL DEL PANEL DE USUARIO (DINÁMICO)
// =========================================================
// Firebase detecta automáticamente si el usuario ya había iniciado sesión antes
onAuthStateChanged(auth, (user) => {
    const panelUsuario = document.getElementById('panelUsuario');
    if(!panelUsuario) return;
    const contenido = panelUsuario.querySelector('.sidebar-contenido');
    
    if (user) {
        // SI EL USUARIO ESTÁ LOGUEADO
        usuarioActual = user;
        contenido.innerHTML = `
            <span class="sidebar-titulo">Mi Espacio</span>
            <div style="text-align: center; margin-top: 40px; font-family: 'Cormorant Garamond', serif;">
                <h3 style="font-size: 2rem; margin-bottom: 10px;">¡Bienvenido de vuelta!</h3>
                <p style="font-family: 'Montserrat'; font-size: 0.9rem; color: #666; margin-bottom: 30px;">${user.email}</p>
                <button id="btnCerrarSesion" class="btn-adquirir w-100" style="background: transparent; border: 1px solid #1a1512; color: #1a1512;">Cerrar Sesión</button>
            </div>
        `;
        // Botón para salir
        document.getElementById('btnCerrarSesion').addEventListener('click', () => signOut(auth));
    } else {
        // SI NO ESTÁ LOGUEADO (Mostramos Login y Registro)
        usuarioActual = null;
        contenido.innerHTML = `
            <span class="sidebar-titulo">Mi Espacio</span>
            
            <div id="vistaLogin">
                <form id="formLogin" class="formulario-minimalista">
                    <input type="email" id="emailLogin" placeholder="Correo Electrónico" required>
                    <input type="password" id="passLogin" placeholder="Contraseña" required>
                    <button type="submit" class="btn-adquirir w-100" style="margin-top:20px;">Iniciar Sesión</button>
                </form>
                <a href="#" id="irARegistro" class="link-sutil">¿Crear una cuenta nueva?</a>
            </div>

            <div id="vistaRegistro" style="display:none;">
                <form id="formRegistro" class="formulario-minimalista">
                    <input type="email" id="emailReg" placeholder="Correo Electrónico" required>
                    <input type="password" id="passReg" placeholder="Contraseña (mín 6 letras)" required>
                    <button type="submit" class="btn-adquirir w-100" style="margin-top:20px;">Crear Cuenta</button>
                </form>
                <a href="#" id="irALogin" class="link-sutil">Ya tengo una cuenta</a>
            </div>
        `;

        // Alternar entre Login y Registro
        document.getElementById('irARegistro').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('vistaLogin').style.display='none'; document.getElementById('vistaRegistro').style.display='block'; });
        document.getElementById('irALogin').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('vistaRegistro').style.display='none'; document.getElementById('vistaLogin').style.display='block'; });

        // Lógica de Crear Cuenta
        document.getElementById('formRegistro').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await createUserWithEmailAndPassword(auth, document.getElementById('emailReg').value, document.getElementById('passReg').value);
                alert("¡Cuenta creada con éxito!");
            } catch (error) { alert("Error: " + error.message); }
        });

        // Lógica de Iniciar Sesión
        document.getElementById('formLogin').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await signInWithEmailAndPassword(auth, document.getElementById('emailLogin').value, document.getElementById('passLogin').value);
            } catch (error) { alert("Contraseña o correo incorrectos."); }
        });
    }
});

// =========================================================
// 3. ENVIAR EL CARRITO CON MÉTODO DE ENTREGA Y USUARIO
// =========================================================
// =========================================================
// 3. ENVIAR EL CARRITO CON ENTREGA, USUARIO Y MÉTODO DE PAGO
// =========================================================
window.finalizarPedido = async function() {
    if (carrito.length === 0) { alert("Tu selección está vacía."); return; }

    // 1. Averiguamos qué método de entrega eligió (Domicilio o Tienda)
    const opcionesEntrega = document.getElementsByName('tipo_entrega');
    let entregaSeleccionada = "Domicilio";
    for(let i=0; i < opcionesEntrega.length; i++) {
        if(opcionesEntrega[i].checked) entregaSeleccionada = opcionesEntrega[i].value;
    }

    // 2. NUEVO: Averiguamos qué método de pago eligió
    const opcionesPago = document.getElementsByName('metodo_pago');
    let pagoSeleccionado = "Tarjeta en Línea";
    for(let i=0; i < opcionesPago.length; i++) {
        if(opcionesPago[i].checked) pagoSeleccionado = opcionesPago[i].value;
    }

    const totalPedido = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    try {
        const boton = document.querySelector('.carrito-footer .btn-adquirir');
        const textoOriginal = boton.textContent;
        boton.textContent = "Procesando...";

        // 3. Guardamos todo en la base de datos de Firebase
        await addDoc(collection(db, "pedidos"), {
            cliente: usuarioActual ? usuarioActual.email : "Invitado", 
            metodoEntrega: entregaSeleccionada, 
            metodoPago: pagoSeleccionado, // Guardamos la opción de pago en la nube
            productos: carrito,
            total: totalPedido,
            fecha: serverTimestamp(),
            estado: "Nuevo"
        });

        // Mensaje personalizado según el pago elegido para guiar al cliente
        if(pagoSeleccionado === "Transferencia Bancaria") {
            alert("¡Pedido Guardado! Te enviaremos los datos bancarios a tu correo para completar la transferencia.");
        } else {
            alert("¡Pedido Exitoso! Tu orden con método '" + pagoSeleccionado + "' se está preparando.");
        }
        
        // Limpieza de interfaz
        carrito = [];
        localStorage.removeItem('carritoBiscuitCity');
        actualizarInterfazCarrito();
        boton.textContent = textoOriginal;
        
    } catch (error) {
        console.error("Error al procesar el pedido con pago:", error);
        alert("Hubo un error al procesar tu pedido.");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    
    /* 1. SEGUIMIENTO DE CURSOR AUTOMÁTICO */
    const cursor = document.getElementById('cursorPremium');
    if (window.innerWidth >= 1024 && cursor) {
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        
        document.addEventListener('mousemove', (e) => { 
            mouseX = e.clientX; 
            mouseY = e.clientY; 
        });
        
        function render() {
            cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }

    /* 2. CAMBIO DE FONDO POR HOVER (Solo actúa en la pantalla Principal) */
    const itemsMenu = document.querySelectorAll('.item-menu-grolet');
    const capasFondo = document.querySelectorAll('.capa-item');
    const fondoDefecto = document.getElementById('bg-defecto');

    if (itemsMenu.length > 0) {
        itemsMenu.forEach(item => {
            item.addEventListener('mouseenter', () => {
                const idFondoDestino = item.getAttribute('data-bg');
                capasFondo.forEach(capa => capa.classList.remove('active'));
                
                const capaDestino = document.getElementById(idFondoDestino);
                if (capaDestino) capaDestino.classList.add('active');
            });
            
            item.addEventListener('mouseleave', () => {
                capasFondo.forEach(capa => capa.classList.remove('active'));
                if (fondoDefecto) fondoDefecto.classList.add('active');
            });
        });
    }

    /* 3. VIGILANTE DE SCROLL (Para las fotos de las páginas internas) */
    const scrollObserver = new IntersectionObserver((entradas, observer) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add('visible');
                observer.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in-up').forEach(el => scrollObserver.observe(el));
});
/* =========================================================
       4. CONTROL DE PANELES (SISTEMA MAESTRO)
       ========================================================= */
    const overlayGeneral = document.getElementById('overlayGeneral');
    
    // Paneles
    const panelMenu = document.getElementById('panelMenu');
    const panelCarrito = document.getElementById('panelCarrito');
    const panelUsuario = document.getElementById('panelUsuario');
    const panelBuscador = document.getElementById('panelBuscador');

    // Función para abrir un panel lateral
    function abrirPanelLateral(panelId) {
        // Cierra los demás paneles laterales primero
        document.querySelectorAll('.sidebar-izquierdo, .sidebar-derecho').forEach(p => p.classList.remove('abierto'));
        document.getElementById(panelId).classList.add('abierto');
        overlayGeneral.classList.add('activo');
    }

    // Función para cerrar todo
    function cerrarTodo() {
        document.querySelectorAll('.sidebar-izquierdo, .sidebar-derecho').forEach(p => p.classList.remove('abierto'));
        if (panelBuscador) panelBuscador.classList.remove('abierto');
        if (overlayGeneral) overlayGeneral.classList.remove('activo');
    }

    // --- EVENTOS DE APERTURA ---
    if (document.getElementById('btnAbrirMenu')) {
        document.getElementById('btnAbrirMenu').addEventListener('click', () => abrirPanelLateral('panelMenu'));
    }
    if (document.getElementById('btnAbrirCarrito')) {
        document.getElementById('btnAbrirCarrito').addEventListener('click', () => abrirPanelLateral('panelCarrito'));
    }
    if (document.getElementById('btnAbrirUsuario')) {
        document.getElementById('btnAbrirUsuario').addEventListener('click', () => abrirPanelLateral('panelUsuario'));
    }
    if (document.getElementById('btnAbrirBuscador')) {
        document.getElementById('btnAbrirBuscador').addEventListener('click', () => {
            cerrarTodo(); // Cerrar overlay si estaba abierto
            panelBuscador.classList.add('abierto');
        });
    }

    // --- EVENTOS DE CIERRE ---
    const botonesCerrar = ['btnCerrarMenu', 'btnCerrarCarrito', 'btnCerrarUsuario'];
    botonesCerrar.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', cerrarTodo);
    });

    if (document.getElementById('btnCerrarBuscador')) {
        document.getElementById('btnCerrarBuscador').addEventListener('click', cerrarTodo);
    }
    if (overlayGeneral) {
        overlayGeneral.addEventListener('click', cerrarTodo);
    }
    // --- FUNCIONALIDAD DEL BUSCADOR ---
const inputBuscador = document.querySelector('.input-gigante');

if (inputBuscador) {
    inputBuscador.addEventListener('input', (e) => {
        const terminoBusqueda = e.target.value.toLowerCase().trim();
        
        // Aquí puedes conectar esto con las tarjetas de tus productos en el futuro
        console.log(`Buscando creaciones que coincidan con: ${terminoBusqueda}`);
        
        // Ejemplo lógico: Si tienes productos en la página con clase '.tarjeta-producto'
        document.querySelectorAll('.tarjeta-producto').forEach(producto => {
            const nombreProducto = producto.querySelector('h3').textContent.toLowerCase();
            if (nombreProducto.includes(terminoBusqueda)) {
                producto.style.display = 'block'; // Lo muestra
            } else {
                producto.style.display = 'none'; // Lo oculta
            }
        });
    });
}
// --- FUNCIONALIDAD DEL CARRITO DE COMPRAS (CON MEMORIA) ---
// 1. Cargamos el carrito desde la memoria del navegador
let carrito = JSON.parse(localStorage.getItem('carritoBiscuitCity')) || [];

// 2. Función para dibujar el carrito en el panel
// 2. Función para dibujar el carrito en el panel (CORREGIDA PARA PESOS COLOMBIANOS)
function actualizarInterfazCarrito() {
    const listaCarrito = document.querySelector('.lista-carrito');
    const totalElemento = document.querySelector('.total-car span:last-child');
    const contadorBoton = document.getElementById('contador-carrito');
    
    if (!listaCarrito) return;

    listaCarrito.innerHTML = '';
    let totalAcumulado = 0;

    carrito.forEach((item, index) => {
        totalAcumulado += item.precio * item.cantidad;
        
        // Formateamos el precio de cada producto para que no use decimales de dólares
        const precioFormateado = item.precio.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        
        const itemHTML = `
            <div class="item-carrito" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #e5d8d0; padding-bottom: 10px;">
                <div class="info-item-car">
                    <h4 style="font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; margin-bottom: 5px;">${item.nombre}</h4>
                    <p style="font-family: 'Montserrat', sans-serif; font-size: 0.85rem; color: #666;">$ ${precioFormateado} x ${item.cantidad}</p>
                </div>
                <button onclick="eliminarDelCarrito(${index})" style="background: none; border: none; color: #a3897e; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; font-weight: bold;">Quitar</button>
            </div>
        `;
        listaCarrito.insertAdjacentHTML('beforeend', itemHTML);
    });

    // Formateamos el gran TOTAL del carrito con puntos de miles colombianos
    if (totalElemento) {
        totalElemento.textContent = `$ ${totalAcumulado.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    
    if (contadorBoton) {
        const totalProductos = carrito.reduce((acc, item) => acc + item.cantidad, 0);
        if (totalProductos > 0) {
            contadorBoton.textContent = totalProductos;
            contadorBoton.style.display = 'flex';
        } else {
            contadorBoton.style.display = 'none';
        }
    }
}

// 3. Función global para agregar productos
/* =========================================================
   FUNCIÓN DEL CARRITO (Con rastreador inteligente)
========================================================= */
// IMPORTANTE: Ahora la función tiene 3 palabras en los paréntesis
window.agregarAlCarrito = function(boton, nombre, precio) {
    
    // 1. BÚSQUEDA INTELIGENTE DE LA CANTIDAD
    // El botón va buscando "hacia arriba" en las cajas hasta encontrar su propio número
    let inputCantidad = null;
    let contenedor = boton.parentElement;
    
    while (contenedor && contenedor !== document.body) {
        inputCantidad = contenedor.querySelector('.input-cantidad');
        if (inputCantidad) {
            break; // ¡Encontró el número!
        }
        contenedor = contenedor.parentElement;
    }

    // Leemos el número de la pantalla (Si no lo encuentra, por seguridad suma 1)
    let cantidadElegida = inputCantidad ? parseInt(inputCantidad.value) : 1;

        // 2. LÓGICA DEL CARRITO
    const productoExistente = carrito.find(item => item.nombre === nombre);

    if (productoExistente) {
        // Le sumamos la cantidad exacta que elegiste en la pantalla
        productoExistente.cantidad += cantidadElegida; 
    } else {
        // Lo guardamos en la bolsa con la cantidad exacta
        carrito.push({ nombre: nombre, precio: precio, cantidad: cantidadElegida });
    }

    // 3. GUARDAR Y MOSTRAR
        localStorage.setItem('carritoBiscuitCity', JSON.stringify(carrito));
    actualizarInterfazCarrito();
    abrirPanelLateral('panelCarrito'); 
};

// 4. Función global para quitar productos
window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1);
    localStorage.setItem('carritoBiscuitCity', JSON.stringify(carrito));
    actualizarInterfazCarrito();
};

// 5. Cargar el carrito automáticamente al entrar a cualquier página
document.addEventListener('DOMContentLoaded', () => {
    actualizarInterfazCarrito();
});
// =========================================================
// NAVBAR INTELIGENTE (OCULTAR AL BAJAR, MOSTRAR AL SUBIR)
// =========================================================
const navbar = document.querySelector('.navbar-premium');
let ultimoScroll = window.scrollY; // Guarda la posición inicial

if (navbar) {
    window.addEventListener('scroll', () => {
        let scrollActual = window.scrollY;
        
        // Excepción de seguridad: Si el panel del carrito o el buscador están abiertos, 
        // NO ocultamos la barra para no dañar la experiencia.
        const overlay = document.getElementById('overlayGeneral');
        if (overlay && overlay.classList.contains('activo')) {
            return;
        }

        // Si bajamos más de 80 píxeles, la ocultamos
        if (scrollActual > ultimoScroll && scrollActual > 80) {
            navbar.classList.add('oculta');
        } 
        // Si subimos, la volvemos a mostrar
        else {
            navbar.classList.remove('oculta');
        }
        
        // Actualizamos la posición para el siguiente movimiento
        ultimoScroll = scrollActual;
    });
}
// Precios fijos para controlar el producto
const PRECIO_9_OZ = 17000;
const PRECIO_12_OZ = 21500; // El precio de 12 oz (puedes cambiar este valor)





// 1. CAMBIO DE PRECIO EN VIVO (Buscando el elemento vecino en el HTML)
window.actualizarPrecioCuchareable = function(elementoSelect) {
    // Buscamos el contenedor del producto para no alterar los demás
    const tarjetaProducto = elementoSelect.closest('.tarjeta-producto') || elementoSelect.parentElement.parentElement;
    const precioPantalla = tarjetaProducto.querySelector('.precio-pantalla-cuchareable');
    
    if (precioPantalla) {
        if (elementoSelect.value === "12 oz") {
            precioPantalla.textContent = `$ ${PRECIO_12_OZ.toLocaleString('es-CO')}`;
        } else {
            precioPantalla.textContent = `$ ${PRECIO_9_OZ.toLocaleString('es-CO')}`;
        }
    }
};

// 2. AÑADIR AL CARRITO (Detectando el tamaño correcto del selector vecino)
// 2. AÑADIR AL CARRITO (Detectando el tamaño correcto del selector vecino)
window.agregarCuchareableConTamano = function(elementoBoton, nombreBase) {
    // Buscamos la tarjeta del producto donde está este botón
    const tarjetaProducto = elementoBoton.closest('.tarjeta-producto') || elementoBoton.parentElement.parentElement.parentElement;
    const selector = tarjetaProducto.querySelector('.selector-tamano-cuchareable');

    const tamanoElegido = selector ? selector.value : "9 oz";
    let precioFinal = tamanoElegido === "12 oz" ? PRECIO_12_OZ : PRECIO_9_OZ;
    const nombreCompleto = `${nombreBase} (${tamanoElegido})`;

    // Le pasamos el balón correctamente a la función principal: (botón, nombre, precio)
    window.agregarAlCarrito(elementoBoton, nombreCompleto, precioFinal);
};
// --- FUNCIÓN DE CONTROL PARA POCKETS (CORREGIDA SIN ALERTA) ---
window.agregarPocketAlCarrito = function(elementoBoton, nombreBase, precioPack) {
    const contenedorPocket = elementoBoton.closest('.tarjeta-pocket');
    const minimoRequerido = parseInt(contenedorPocket.getAttribute('data-minimo'));
    
    const casillasMarcadas = contenedorPocket.querySelectorAll('.opciones-pocket input[type="checkbox"]:checked');
    const cantidadSeleccionada = casillasMarcadas.length;

    // Solo mantenemos la alerta si hay un error para guiar al usuario
    if (cantidadSeleccionada === 0) {
        alert(`Por favor arma tu pack. Debes seleccionar exactamente ${minimoRequerido} galletas.`);
        return;
    }
    
    if (cantidadSeleccionada !== minimoRequerido) {
        alert(`Seleccionaste ${cantidadSeleccionada} galletas. Recuerda que para la ${nombreBase} debes elegir exactamente ${minimoRequerido} opciones.`);
        return;
    }

    let saboresElegidos = [];
    casillasMarcadas.forEach(casilla => {
        saboresElegidos.push(casilla.value);
    });

    const nombreCompletoProducto = `${nombreBase} [${saboresElegidos.join(', ')}]`;

    // 1. Añadimos el pack al carrito
    window.agregarAlCarrito(elementoBoton, nombreCompletoProducto, precioPack);

    // 2. Desmarcamos las casillas para que quede limpio para la próxima
    casillasMarcadas.forEach(casilla => casilla.checked = false);
    
    // 3. ABRE LA BOLSA DE COMPRAS DIRECTAMENTE
    // Nota: Asegúrate de que este sea el nombre real de tu función para abrir el panel del carrito
    if (typeof window.abrirCarrito === 'function') {
        window.abrirCarrito();
    } else if (typeof abrirCarrito === 'function') {
        abrirCarrito();
    } else {
        // Si tu carrito se abre añadiendo una clase CSS (por ejemplo, 'active') al contenedor:
        const panelCarrito = document.querySelector('.carrito-panel') || document.querySelector('.sidebar-cart');
        if (panelCarrito) {
            panelCarrito.classList.add('active'); // Cambia 'active' por la clase que uses para mostrarlo
        }
    }
};
/* =========================================================
   MOTOR DE BÚSQUEDA INTERNO (A PRUEBA DE ERRORES)
========================================================= */

// Esta línea protege el código para que cargue solo cuando la página esté lista
document.addEventListener('DOMContentLoaded', () => {
    
    const productos = [
        { nombre: "Cuchareable de Leche KLIM", url: "cuchareables.html" },
        { nombre: "Cuchareable Pie de Limón", url: "cuchareables.html" },
        { nombre: "Galleta Red Velvet", url: "galletas.html" },
        { nombre: "Galleta de Chocolate", url: "galletas.html" },
        { nombre: "Malteada Vainilla Francesa", url: "malteadas.html" },
        { nombre: "Malteada Macadamia Premium", url: "malteadas.html" },
        { nombre: "Helado de Temporada", url: "malteadas.html" },
        { nombre: "Pocket Cookies", url: "pocket.html" }
    ];

    const inputBuscador = document.getElementById('inputBuscador');
    const cajaResultados = document.getElementById('cajaResultados');

    // Solo activamos esto si el buscador realmente existe en la página actual
    if (inputBuscador && cajaResultados) {
        
        inputBuscador.addEventListener('keyup', () => {
            let textoBuscado = inputBuscador.value.toLowerCase().trim();
            cajaResultados.innerHTML = '';
            
            if (textoBuscado === '') {
                cajaResultados.style.display = 'none';
                return;
            }

            let resultados = productos.filter(producto => 
                producto.nombre.toLowerCase().includes(textoBuscado)
            );

            cajaResultados.style.display = 'block';

            if (resultados.length > 0) {
                resultados.forEach(producto => {
                    let enlace = document.createElement('a');
                    enlace.href = producto.url;
                    enlace.textContent = producto.nombre;
                    enlace.classList.add('item-resultado');
                    cajaResultados.appendChild(enlace);
                });
            } else {
                let mensajeVacio = document.createElement('div');
                mensajeVacio.textContent = "No se encontraron productos.";
                mensajeVacio.classList.add('sin-resultados');
                cajaResultados.appendChild(mensajeVacio);
            }
        });

        // Ocultar resultados si hacen clic fuera
        document.addEventListener('click', (evento) => {
            if (!inputBuscador.contains(evento.target) && !cajaResultados.contains(evento.target)) {
                cajaResultados.style.display = 'none';
            }
        });
    }
});
/* =========================================================
   FUNCIONALIDAD DEL SELECTOR DE CANTIDAD (ACTUALIZADO)
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    // Buscamos todos los selectores de cantidad en la página
    const todosLosSelectores = document.querySelectorAll('.selector-cantidad-premium');

    todosLosSelectores.forEach(selector => {
        // Para cada selector, identificamos sus botones y su input
        const btnRestar = selector.querySelector('.btn-restar');
        const btnSumar = selector.querySelector('.btn-sumar');
        const inputCantidad = selector.querySelector('.input-cantidad');

        // Nos aseguramos de que existan antes de darles las órdenes
        if (btnRestar && btnSumar && inputCantidad) {
            
            // Orden para el botón de SUMAR (+)
            btnSumar.addEventListener('click', () => {
                let valorActual = parseInt(inputCantidad.value);
                inputCantidad.value = valorActual + 1;
            });

            // Orden para el botón de RESTAR (-)
            btnRestar.addEventListener('click', () => {
                let valorActual = parseInt(inputCantidad.value);
                // La regla de oro: No bajar de 1
                if (valorActual > 1) {
                    inputCantidad.value = valorActual - 1;
                }
            });
            
        }
    });
});