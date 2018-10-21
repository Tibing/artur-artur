chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    const video = $('#player video:first');
    if (request.action === 'getAudioSrc') {
      // var videoSrc = $video.find('source:first').attr('src');
      // const audioSrc = 'https://psv4.vkuseraudio.net/c422316/u219122016/audios/2b615d526336.mp3?extra=HWE1Imfb2b8n2DXnec-iKBa-LFzgQtPYID-LC4WsD0RQjIYsi9mnmGQNph21IE1PkHnXKsWpRna9VZAD1YhfRTJZ7GIoGR56DeXuuXtYTILPlfGGm9h658jUlq8Q-FKsDPVyFjErpFup6V8cJ4KFpnCF558';
      // sendResponse({ audioSrc });
    }
  }
);

const dataAttr = 'data-play-to-kodi';
const audioClassName = 'audio_row';

const tracks = [ ...document.querySelectorAll(`.${audioClassName}`) ];
tracks.forEach(updateOneAudio);

const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.type === 'childList') {
      for (var i = 0; i < mutation.addedNodes.length; i++) {
        const node = mutation.addedNodes[ i ];

        if (node.classList && node.classList.contains(audioClassName)) {
          updateOneAudio(node);
        }
      }
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

function updateOneAudio(audio) {
  'use strict';
  var link = null;

  var audioActs = audio.querySelector('.audio_row__info');
  //audioActs = audioActs.
  //console.log(audioActs);
  if (audioActs.querySelector('.downloadButton')) {
    return;
  }
  // console.log("audio " + audioActs);

  var info = getAudioInfo(audio);

  var artist = info.artist;
  var title = info.title;

  const stringTitle = artist + ' - ' + title + '.mp3';

  const audiosToDownload = {
    artist: artist,
    title: title,
    url: link,
    album: '',
    fullId: audio.dataset.fullId,
    track_addon: info.track_addon
  };

  var downloadButton = document.createElement('div');
  downloadButton.className = 'downloadButton audio_act';

  downloadButton.setAttribute('style', 'display:block; margin: 17px 5px 0 5px');
  const htmlLink = document.createElement('a');
  htmlLink.innerText = 'Play to Kodi';
  htmlLink.className = 'downloadButton fngfng';
  htmlLink.setAttribute('download', stringTitle);
  audio.setAttribute(dataAttr, JSON.stringify(audiosToDownload));

  htmlLink.setAttribute('href', link);
  htmlLink.href = '#';

  downloadButton.appendChild(htmlLink);

  htmlLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    var url = getUrlMp3(audiosToDownload.fullId + '_' + audiosToDownload.track_addon, (data) => {
      var url = parseMp3(data);

      if (url) {
        url.then(function (link) {
          chrome.runtime.sendMessage({ action: 'playVKAudio', link }, () => {

            const tracks = [ ...document.querySelectorAll(`.${audioClassName}`) ];
            let active = tracks.findIndex(track => {
              const trackInfo = JSON.parse(track.getAttribute(dataAttr));
              return trackInfo.fullId === audiosToDownload.fullId;
            });

            const listener = () => {
              if (tracks.length <= active) {
                chrome.runtime.onMessage.removeListener(listener);
                return;
              }

              const audiosToDownload = JSON.parse(tracks[ ++active ].getAttribute(dataAttr));

              getUrlMp3(audiosToDownload.fullId + '_' + audiosToDownload.track_addon, (data) => {
                const url = parseMp3(data);
                if (url) {
                  url.then(link => chrome.runtime.sendMessage({ action: 'playVKAudio.loadNextRes', link, active }), () => {
                  });
                  console.log(`Item with id: ${active} was added`);
                } else {
                  console.warn(`Item with id: ${active} ALARM!!!!`);
                }

                listener();
              });
            };

            listener();
          });
        });
      } else {
        const error = document.createElement('div');
        error.innerText = 'Unavailable, ЛОХ, ПИДР!';
        error.setAttribute('style', `
          z-index: 100000; 
          position: fixed; 
          left: 10px;
          bottom: 24px; 
          color: #fff;          
          background: rgba(54,56,59,.96);          
          border-radius: 4px;          
          box-shadow: 0 2px 3px rgba(0,0,0,.2);          
          font-size: 5rem;          
          cursor: pointer;          
          padding: 10px 12px;
          font-weight: 600;
        `);
        document.body.appendChild(error);
        setTimeout(() => document.body.removeChild(error), 3000);
        error.addEventListener('click', () => document.body.removeChild(error));
      }
    });
  });
  audioActs.insertBefore(downloadButton, audioActs.firstChild);
}

function getAudioInfo(audio) {
  var id = audio.getAttribute('data-full-id');
  if (id) {
    const info = JSON.parse(audio.dataset[ 'audio' ]);
    var track_addon = info[ 13 ];
    var check = '/\/\/', sec;//indexOf(info[13]);
    if (track_addon.indexOf(check) + 1) {
      console.log(1);
      sec = track_addon.split('/\/\/')[ 1 ];
    } else {
      sec = track_addon.split('/\/')[ 1 ];
    }
    return {
      type: 'getAudioInfo',
      fullId: audio.dataset.fullId,
      length: info[ 5 ],
      artist: info[ 4 ],
      title: info[ 3 ],
      track_addon: track_addon.split('/')[ 2 ] + '_' + sec
    }
  }
}

function getUrlMp3(vkId, callback) {
  //var track_addon = 'd698427d09a1bac88b_f251300fd42d39be8d';
  var body = 'act=reload_audio&al=1&ids=' + vkId;
  console.log(body);

  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://vk.com/al_audio.php', true);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  //xhr.setRequestHeader('origin', 'https://vk.com');

  xhr.responseType = 'text';
  xhr.onreadystatechange = function (e) {
    if (xhr.readyState != 4) return;

    if (xhr.status == 200) {
      console.log(xhr.responseText);
      callback(xhr.responseText);
    }
  };
  xhr.send(body);
}

function parseMp3(responce) {
  var json = responce.split('<!json>')[ 1 ].split('<!>')[ 0 ];
  var data = JSON.parse(json);
  if (data && data[ 0 ] && data[ 0 ][ 2 ]) {
    var lnk = data[ 0 ][ 2 ];
    var obj = z(lnk);
    console.log(obj);
    return obj;

  }
  return 0;
}

function z(B) {
  //console.log(B);
  var C = 'vkmusic-player-data-' + Math.random();
  return new Promise(function (D) {
    var E = document.createElement('script');
    E.text = '\n(function(){\n const player = new AudioPlayerHTML5({onFrequency:function(){}});\n player.setUrl(\'' + B + '\');\n document.body.setAttribute(\'' + C + '\',player._currentAudioEl.src)\n})();\n', document.body.appendChild(E), D(document.body.getAttribute(C)), setTimeout(function () {
      return document.body.getAttribute(C, '')
    })
  })
}
