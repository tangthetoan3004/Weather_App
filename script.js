// Lấy phần tử DOM
const cityInput = document.querySelector('.city-input');
const searchBtn = document.querySelector('.search-btn');

const weatherInfoSection = document.querySelector('.weather-info');
const notFoundSection = document.querySelector('.not-found');
const searchCitySection = document.querySelector('.search-city');

const hourlyforecastItemsContainer = document.querySelector('.hourly-forecast-items-container');
const dailyforecastItemsContainer = document.querySelector('.daily-forecast-items-container');
const loaderWrapper = document.getElementById('loader-wrapper');
const mainContainer = document.querySelector('.main-container');

const countryTxt = document.querySelector('.country-txt');
const tempTxt = document.querySelector('.temp-txt');
const conditionTxt = document.querySelector('.condition-txt');
const humidityValueTxt = document.querySelector('.Humidity-value-txt');
const windValueTxt = document.querySelector('.Wind-value-txt');
const weatherSummaryImg = document.querySelector('.weather-summary-img');
const currentDateTxt = document.querySelector('.current-date-txt');
const cityHourTxt = document.querySelector('.current-hour-txt');


// Ẩn các section và hiển thị section truyền vào
function showDisplaySection(section) {
    [weatherInfoSection, notFoundSection, searchCitySection].forEach(sec => sec.style.display = 'none');
    section.style.display = 'flex';
}

// Hiển thị múi giờ GMT từ giây
function displayGMTOffset(gmtOffsetSeconds) {
    const gmtHours = gmtOffsetSeconds / 3600;
    return `GMT${gmtHours >= 0 ? '+' : ''}${gmtHours}`;
}


// Trả về tên file ảnh dựa theo weather ID
function getWeatherIcon(id) {
    if (id <= 232) return 'thunderstorm.svg';
    if (id <= 321) return 'drizzle.svg';
    if (id <= 531) return 'rain.svg';
    if (id <= 622) return 'snow.svg';
    if (id <= 781) return 'atmosphere.svg';
    if (id === 800) return 'clear.svg';
    if (id <= 804) return 'clouds.svg';
}

// Trả về ngày hiện tại theo múi giờ (zoneName)
function getDateFromZone(zoneName) {
    const options = { weekday: 'short', month: 'short', day: '2-digit', timeZone: zoneName };
    return new Date().toLocaleDateString('en-GB', options);
}

// Cập nhật dự báo theo giờ
async function updateHourlyForecast(city, zoneName) {
    const forecastData = await getFetchData('forecast', city);
    hourlyforecastItemsContainer.innerHTML = '';
    if (!forecastData || !forecastData.list) return;

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: zoneName });
    const now = new Date(todayStr);
    const next24Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const next24HoursData = forecastData.list.filter(item => {
        const itemDate = new Date(item.dt * 1000);
        return itemDate >= now && itemDate <= next24Hours;
    })
    .sort((a, b) => a.dt - b.dt);

    next24HoursData.forEach(item => {
        const { dt, main: { temp }, weather: [{ id }] } = item;
        const dateObj = new Date(dt * 1000);

        const hourStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zoneName });

        const forecastHTML = `
            <div class="hourly-forecast-item">
                <h5 class="hourly-forecast-item-hour regular-txt">${hourStr}</h5>
                <img src="assets/weather/${getWeatherIcon(id)}" class="hourly-forecast-item-img" />
                <h5 class="hourly-forecast-item-temp">${Math.round(temp)}&deg;</h5>
            </div>
        `;
        hourlyforecastItemsContainer.insertAdjacentHTML('beforeend', forecastHTML);
    });
}


// Cập nhật dự báo theo ngày
async function updateForecastsInfo(city, zoneName) {
    const forecastData = await getFetchData('forecast', city);
    if (!forecastData || !forecastData.list) return;

    dailyforecastItemsContainer.innerHTML = '';

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA', { timeZone: zoneName });
    const currentHour = new Date().toLocaleDateString('en-CA', {
        hour: '2-digit',
        hour12: false,
        timeZone: zoneName
    })

    const forecastsByDate = new Map();

    forecastData.list.forEach(item => {
        const itemDate = new Date(item.dt * 1000);
        const dateStr = itemDate.toLocaleDateString('en-CA', { timeZone: zoneName });
        
        if (!forecastsByDate.has(dateStr)) forecastsByDate.set(dateStr, []);
        forecastsByDate.get(dateStr).push(item);
    });

    let count = 0;

    const sortedEntries = Array.from(forecastsByDate.entries()).sort(
        ([dateA], [dateB]) => new Date(dateA) - new Date(dateB)
    );
    
    for (const [dateStr, items] of sortedEntries) {
        if (count >= 7) break;
    
        let bestItem = items[0];
        let minDiff = Math.abs(new Date(items[0].dt * 1000).getHours() - currentHour);
    
        items.forEach(item => {
            const diff = Math.abs(new Date(item.dt * 1000).getHours() - currentHour);
            if (diff < minDiff) {
                bestItem = item;
                minDiff = diff;
            }
        });
    
        const isToday = dateStr === todayStr;        
        updateForecastItem(bestItem, isToday, zoneName);
        count++;
    }
}


// Lấy giờ hiện tại theo zoneName
function getTimeFromZoneName(zoneName) {
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: zoneName
    };
    return new Date().toLocaleTimeString('en-GB', options);
}

// Bắt đầu đồng hồ thời gian thực theo zoneName
function startCityClockWithZone(zoneName, gmtOffset) {
    if (window.cityClockInterval) clearInterval(window.cityClockInterval);

    function updateTime() {
        cityHourTxt.textContent = `${getTimeFromZoneName(zoneName)} ${displayGMTOffset(gmtOffset)}`;
    }

    updateTime();
    window.cityClockInterval = setInterval(updateTime, 1000);
}


// Cập nhật 1 item dự báo ngày
function updateForecastItem(weatherData, isToday = false, zoneName) {
    const { dt, weather: [{ id }], main: { temp } } = weatherData;
    
    const dateTaken = new Date(dt * 1000);
    const dateResult = dateTaken.toLocaleDateString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        timeZone: zoneName
    });

    const highlightClass = isToday ? 'highlight-today' : '';

    const forecastItem = `
        <div class="daily-forecast-item ${highlightClass}">
            <h5 class="daily-forecast-item-date regular-txt">${dateResult}</h5>
            <img src="assets/weather/${getWeatherIcon(id)}" class="daily-forecast-item-img" />
            <h5 class="daily-forecast-item-temp">${Math.round(temp)}&deg;C</h5>
        </div>
    `;
    dailyforecastItemsContainer.insertAdjacentHTML('beforeend', forecastItem);
}


// Lấy zoneName từ toạ độ
async function fetchCityTimezoneInfo(lat, lon) {
    const url = `https://api.timezonedb.com/v2.1/get-time-zone?key=${timeZoneDbKey}&format=json&by=position&lat=${lat}&lng=${lon}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK') {
            return {
                zoneName: data.zoneName,
                gmtOffset: data.gmtOffset
            };
        }
    } catch (error) {
        console.error('TimeZoneDB Error:', error);
        return null;
    }
}

// Từ tên thành phố → zoneName
async function getZoneNameByCity(city) {
    const geoAPI = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
    try {
        const res = await fetch(geoAPI);
        const data = await res.json();
        if (data.coord) {
            return await fetchCityTimezoneInfo(data.coord.lat, data.coord.lon);
        }
    } catch (err) {
        console.error('Geo fetch error:', err);
    }
    return null;
}

// Gọi API thời tiết theo endpoint và city
async function getFetchData(endPoint, city) {
    try {
        const apiUrl = `https://api.openweathermap.org/data/2.5/${endPoint}?q=${city}&appid=${apiKey}&units=metric`;
        const response = await fetch(apiUrl);
        return await response.json();
    } catch (err) {
        console.error('Fetch error:', err);
        return { cod: 500 };
    }
}

// Cập nhật toàn bộ thông tin thời tiết
async function updateWeatherInfo(city, zoneName, gmtOffset) {
    const weatherData = await getFetchData('weather', city);
    if (weatherData.cod !== 200) {
        showDisplaySection(notFoundSection);
        return;
    }

    const { name: country, main: { temp, humidity }, weather: [{ id, main }], wind: { speed } } = weatherData;
    countryTxt.textContent = country;
    tempTxt.textContent = `${Math.round(temp)}°C`;
    conditionTxt.textContent = main;
    humidityValueTxt.textContent = `${humidity}%`;
    windValueTxt.textContent = speed + ' M/s';
    weatherSummaryImg.src = `assets/weather/${getWeatherIcon(id)}`;
    currentDateTxt.textContent = getDateFromZone(zoneName);

    startCityClockWithZone(zoneName, gmtOffset);
    await updateHourlyForecast(city, zoneName);
    await updateForecastsInfo(city, zoneName);

    showDisplaySection(weatherInfoSection);
}

// Tìm theo nút search
searchBtn.addEventListener('click', async () => {
    const city = cityInput.value.trim();
    if (city) {
        const zoneName = await getZoneNameByCity(city);
        if (zoneName) {
            await updateWeatherInfo(city, zoneName.zoneName, zoneName.gmtOffset);
            cityInput.value = '';
            cityInput.blur();
        }
        else {
            showDisplaySection(notFoundSection);
            cityInput.blur();
        }
    }
});

// Tìm theo Enter
cityInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' && cityInput.value.trim() !== '') {
        const city = cityInput.value.trim();
        if (city) {
            const zoneName = await getZoneNameByCity(city);
            if (zoneName) {
                await updateWeatherInfo(city, zoneName.zoneName, zoneName.gmtOffset);
                cityInput.value = '';
                cityInput.blur();
            }
            else {
                showDisplaySection(notFoundSection);
                cityInput.blur();
            }
        }
    }
});

// Hiệu ứng ẩn loader
function hideLoaderAndShowMain() {
    loaderWrapper.classList.add('fade-out');
    setTimeout(() => {
        loaderWrapper.style.display = 'none';
        mainContainer.style.display = 'block';
        setTimeout(() => {
            mainContainer.classList.add('fade-in');
        }, 50);
    }, 800);
}

// Lấy vị trí người dùng
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const zoneName = await fetchCityTimezoneInfo(lat, lon);
            const geoAPI = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

            try {
                const res = await fetch(geoAPI);
                const data = await res.json();
                await updateWeatherInfo(data.name, zoneName.zoneName, zoneName.gmtOffset);
            } catch (e) {
                showDisplaySection(searchCitySection);
            }
            hideLoaderAndShowMain();
        },
        (error) => {
            showDisplaySection(searchCitySection);
            hideLoaderAndShowMain();
        }
    );
} else {
    showDisplaySection(searchCitySection);
    hideLoaderAndShowMain();
}
