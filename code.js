(() => {
    const config = {
        massFactor : 0.002,  // Коэффициент при вычислении массы частицы
        defParticleColor : "rgba(250, 10, 30, 0.9)", // Цвет частицы по умолчанию
        maxParticleNum : 250, // Максимальное количество частиц
        smooth : 0.98, // Трение
        logoSizePerscent : 0.7, // Процент размера логотипа
        targetMass : 0.01,
        attractorMass :0.02,
        mouseMass :0.005
    }
    const canvas = document.querySelector("canvas");
    const ctx    = canvas.getContext("2d");

    // Глобальные переменные
    let width, height, mouse, particles = [], centerAttractor, flows = [], destroyPoint;
    let startPoints = []; // Точки для телепортации после достижения цели

    // Инициализация
    function init()
    {
        width = canvas.width = canvas.getBoundingClientRect().width;
        height = canvas.height = canvas.getBoundingClientRect().height;
        mouse = {x: 0, y: 0};
        particles = [];
        flows = [];
    }
    init();

    const constants = {
        TWO_PI : Math.PI * 2,
        MAX_CANVAS_SIZE : Math.max(width, height),
        MIN_CANVAS_SIZE : Math.min(width, height),
        MAX_PARTICLE_SIZE : Math.min(width, height) / 200,
        MOUSE_WIDTH: Math.min(width, height) * 0.2
    }

    function getRandom(min, max)
    {
        return Math.random() * (max - min) + min;
    }
    // Частица
    class Particle 
    {
        constructor()
        {
            this.pos   = {x: getRandom(0, width), y: getRandom(0, height)}; // Координаты
            this.vel   = {x: 0, y: 0};                                          // Скорсть
            this.size  = Math.random() * constants.MAX_PARTICLE_SIZE + 1;       // Размер
            this.mass  = this.size * config.massFactor;                         // Масса
            this.color = config.defParticleColor;                               // Цвет
        }
        update()
        {
            this.pos.x += this.vel.x;
            this.pos.y += this.vel.y;
        }
        draw()
        {
            this.update()
            createCircle(this.pos.x, this.pos.y, this.size, true, this.color);
            createCircle(this.pos.x, this.pos.y, this.size, false, config.defParticleColor);
        }
    } 

    class Flow
    {
        constructor(targetPoint, targetMass, point1, point2, point3, point4)
        {
            this.targetPoint = targetPoint;
            this.targetMass = targetMass;
            this.points = [point1, point2, point3, point4];
        }
        particleInQuadrilateral(particle) {
            var inside = false;
            
            let x = particle.pos.x;
            let y = particle.pos.y;
            var inside = false;
            for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
                var xi = this.points[i].x, yi = this.points[i].y;
                var xj = this.points[j].x, yj = this.points[j].y;
                
                var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }
        draw(){
            createLines(this.points, false, constants.defParticleColor);
            createCircle(this.targetPoint.x, this.targetPoint.y, 5, true, "rgb(255,255,255)")
        }
    }
    function createCircle(x, y, size, fill, color)
    {
        ctx.fillStyle = ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(x,y,size, 0, constants.TWO_PI);
        ctx.closePath();
        fill ? ctx.fill() : ctx.stroke();
    }
    function createLines(points, fill, color)
    {
        if (points.length < 3)
            return;

        ctx.fillStyle = ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++)
            ctx.lineTo(points[i].x, points[i].y);
        ctx.lineTo(points[0].x, points[0].y);
        ctx.closePath();
        fill ? ctx.fill : ctx.stroke();
    }

    function setPos(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    }
    canvas.addEventListener('mousemove', setPos);

    function updateParticles() {
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].pos.y >= destroyPoint.y)
            {
                j = Math.trunc(getRandom(0,startPoints.length - 0.01));
                particles[i].pos.x = startPoints[j].x;
                particles[i].pos.y = startPoints[j].y;
            }
            let acc = {x : 0, y: 0};
            let inFlow = false; // Находится ли частица в потоке
            // Движение по потоку
            for (let j = 0; j < flows.length; j++) {
                if (flows[j].particleInQuadrilateral(particles[i])) {
                    let delta = {x: flows[j].targetPoint.x - particles[i].pos.x, y: flows[j].targetPoint.y - particles[i].pos.y};
                    let force = flows[j].targetMass;
                    acc.x += force * delta.x;
                    acc.y += force * delta.y;
                    inFlow = true;
                }
            }
            // Притяжение к центру
            if (!inFlow)
            {
                let delta = {x: centerAttractor.pos.x - particles[i].pos.x, y: centerAttractor.pos.y - particles[i].pos.y};
                let distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
                let force = centerAttractor.mass;
                acc.x += force * delta.x;
                acc.y += force * delta.y;
            }

            // Отталкивание от курсора
            let delta = {x: particles[i].pos.x - mouse.x, y: particles[i].pos.y - mouse.y};
            let dist = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
            if (dist < constants.MOUSE_WIDTH)
            {
                let force = (constants.MOUSE_WIDTH - dist) * config.mouseMass;
                acc.x += delta.x * force;
                acc.y += delta.y * force;
            }

            // Изменение скорости
            particles[i].vel.x = particles[i].vel.x * config.smooth + acc.x * particles[i].mass;
            particles[i].vel.y = particles[i].vel.y * config.smooth + acc.y * particles[i].mass;
        }
    }

    function initAttractors()
    {
        centerAttractor = new Particle();
        centerAttractor.mass = config.attractorMass;
        centerAttractor.pos = {x: width / 2, y: height * 0.33};

        
        logoMinX = width / 2 - constants.MIN_CANVAS_SIZE * (config.logoSizePerscent / 2);
        logoMinY = height / 2 - constants.MIN_CANVAS_SIZE * (config.logoSizePerscent / 2);
        logoWidth = constants.MIN_CANVAS_SIZE * config.logoSizePerscent;
        logoHeight = constants.MIN_CANVAS_SIZE * config.logoSizePerscent;

        startPoints.push({x: logoMinX + logoWidth * 0.5, y: logoMinY});
        startPoints.push({x: logoMinX + logoWidth * 0.37, y: logoMinY + logoHeight * 0.061});
        startPoints.push({x: logoMinX + logoWidth * 0.621, y: logoMinY + logoHeight * 0.061});

        destroyPoint = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight * 0.97};

        curPoint1 = {x: logoMinX + logoWidth * 0.49, y: logoMinY};
        curPoint2 = {x: logoMinX + logoWidth * 0.51, y: logoMinY};
        curPoint3 = {x: logoMinX + logoWidth * 0.51, y: logoMinY + logoHeight * 0.6};
        curPoint4 = {x: logoMinX + logoWidth * 0.49, y: logoMinY + logoHeight * 0.6};

        targetPoint = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight * 0.6};
        targetMass = config.targetMass

        flows.push(new Flow(targetPoint, targetMass, curPoint1, curPoint2, curPoint3, curPoint4));

        curPoint1 = {x: logoMinX + logoWidth * 0.49, y: logoMinY + logoHeight * 0.5};
        curPoint2 = {x: logoMinX + logoWidth * 0.51, y: logoMinY + logoHeight * 0.5};
        curPoint3 = {x: logoMinX + logoWidth * 0.51, y: logoMinY + logoHeight};
        curPoint4 = {x: logoMinX + logoWidth * 0.49, y: logoMinY + logoHeight};
        
        targetPoint = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight};
        targetMass = config.targetMass

        flows.push(new Flow(targetPoint, targetMass, curPoint1, curPoint2, curPoint3, curPoint4));
        
        curPoint1 = {x: logoMinX + logoWidth * 0.36, y: logoMinY + logoHeight * 0.06};
        curPoint2 = {x: logoMinX + logoWidth * 0.38, y: logoMinY + logoHeight * 0.06};
        curPoint3 = {x: logoMinX + logoWidth * 0.273, y: logoMinY + logoHeight * 0.22};
        curPoint4 = {x: logoMinX + logoWidth * 0.2, y: logoMinY + logoHeight * 0.22};
        
        targetPoint = {x: logoMinX + logoWidth * 0.2365, y: logoMinY + logoHeight * 0.22};
        targetMass = config.targetMass
        flows.push(new Flow(targetPoint, targetMass, curPoint1, curPoint2, curPoint3, curPoint4));

        curPoint1 = {x: logoMinX + logoWidth * 0.611, y: logoMinY + logoHeight * 0.06};
        curPoint2 = {x: logoMinX + logoWidth * 0.631, y: logoMinY + logoHeight * 0.06};
        curPoint3 = {x: logoMinX + logoWidth * 0.800, y: logoMinY + logoHeight * 0.22};
        curPoint4 = {x: logoMinX + logoWidth * 0.727, y: logoMinY + logoHeight * 0.22};
        
        targetPoint = {x: logoMinX + logoWidth * 0.7635, y: logoMinY + logoHeight * 0.22};
        targetMass = config.targetMass
        flows.push(new Flow(targetPoint, targetMass, curPoint1, curPoint2, curPoint3, curPoint4));

        curPoint1 = {x: logoMinX + logoWidth * 0.17, y: logoMinY + logoHeight * 0.20};
        curPoint2 = {x: logoMinX + logoWidth * 0.253, y: logoMinY + logoHeight * 0.20};
        curPoint3 = {x: logoMinX + logoWidth * 0.81, y: logoMinY + logoHeight * 0.71};
        curPoint4 = {x: logoMinX + logoWidth * 0.724, y: logoMinY + logoHeight * 0.71};
        
        targetPoint = {x: logoMinX + logoWidth * 0.767, y: logoMinY + logoHeight * 0.71};
        targetMass = config.targetMass
        flows.push(new Flow(targetPoint, targetMass, curPoint1, curPoint2, curPoint3, curPoint4));

        curPoint1 = {x: logoMinX + logoWidth * 0.747, y: logoMinY + logoHeight * 0.20};
        curPoint2 = {x: logoMinX + logoWidth * 0.820, y: logoMinY + logoHeight * 0.20};
        curPoint3 = {x: logoMinX + logoWidth * 0.286, y: logoMinY + logoHeight * 0.71};
        curPoint4 = {x: logoMinX + logoWidth * 0.2, y: logoMinY + logoHeight * 0.71};
        
        targetPoint = {x: logoMinX + logoWidth * 0.243, y: logoMinY + logoHeight * 0.71};
        targetMass = config.targetMass
        flows.push(new Flow(targetPoint, targetMass, curPoint1, curPoint2, curPoint3, curPoint4));

        curPoint1 = {x: logoMinX + logoWidth * 0.18, y: logoMinY + logoHeight * 0.69};
        curPoint2 = {x: logoMinX + logoWidth * 0.264, y: logoMinY + logoHeight * 0.69};
        curPoint3 = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight * 0.926};
        curPoint4 = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight * 1};
        
        targetPoint = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight * 1};
        targetMass = config.targetMass
        flows.push(new Flow(targetPoint, targetMass, curPoint1, curPoint2, curPoint3, curPoint4));
        curPoint1 = {x: logoMinX + logoWidth * 0.744, y: logoMinY + logoHeight * 0.69};
        curPoint2 = {x: logoMinX + logoWidth * 0.830, y: logoMinY + logoHeight * 0.69};
        curPoint3 = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight * 1};
        curPoint4 = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight * 0.926};
        
        targetPoint = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight * 1};
        targetPoint = {x: logoMinX + logoWidth * 0.5, y: logoMinY + logoHeight * 1};
        targetMass = config.targetMass
        flows.push(new Flow(targetPoint, targetMass, curPoint1, curPoint2, curPoint3, curPoint4));
    }
    initAttractors();
    
    function loop(){
        ctx.clearRect(0,0, width, height);
        if (particles.length < config.maxParticleNum)
            particles.push(new Particle());
        updateParticles()
        particles.map(e => e.draw());
        window.requestAnimationFrame(loop);
    }
    loop();
})();