const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const tileLayer = mapboxToken
  ? {
      url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`,
      attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
    }
  : {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
    };
