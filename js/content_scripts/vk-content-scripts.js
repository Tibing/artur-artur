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
const audioRawActionsClass = 'audio_row__actions';

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
  var link = null;

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

  audio.setAttribute(dataAttr, JSON.stringify(audiosToDownload));

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'childList') {
        for (var i = 0; i < mutation.addedNodes.length; i++) {
          const actions = mutation.addedNodes[ i ];

          if (actions.classList && actions.classList.contains(audioRawActionsClass)) {
            const shareIcon = document.createElement('div');
            shareIcon.classList.add(...[ 'audio_row__action' ]);
            shareIcon.setAttribute('download', stringTitle);
            shareIcon.setAttribute('style', `
              background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%3E%0A%20%20%3Cpath%20fill%3D%22%23828A99%22%20fill-rule%3D%22nonzero%22%20d%3D%22M8.557%2016.819a.9.9%200%201%200%201.084-1.438c-1.176-.886-1.841-2.099-1.841-3.38%200-1.283.665-2.496%201.841-3.382A.9.9%200%200%200%208.558%207.18C6.95%208.393%206%2010.125%206%2012.001c0%201.874.949%203.606%202.557%204.818zM12%2014a2%202%200%201%200%200-4%202%202%200%200%200%200%204zm3.443%202.819C17.05%2015.607%2018%2013.875%2018%2012s-.95-3.607-2.559-4.819a.9.9%200%201%200-1.083%201.438c1.177.886%201.842%202.1%201.842%203.381%200%201.282-.665%202.495-1.84%203.381a.9.9%200%201%200%201.083%201.438zm4.183%201.87C21.137%2016.943%2022%2014.554%2022%2012.009c0-2.53-.853-4.907-2.349-6.65l-.017-.021-.024-.028a.9.9%200%201%200-1.36%201.18l.022.025.013.015c1.211%201.413%201.915%203.373%201.915%205.48%200%202.117-.712%204.087-1.935%205.501a.9.9%200%200%200%201.361%201.178zm-15.252%200a.9.9%200%200%200%201.36-1.178C4.513%2016.097%203.8%2014.127%203.8%2012.01c0-2.106.704-4.066%201.915-5.479l.013-.015.022-.025a.9.9%200%200%200-1.36-1.18l-.024.028-.017.02C2.853%207.102%202%209.478%202%2012.01c0%202.545.863%204.934%202.374%206.68z%22%2F%3E%0A%3C%2Fsvg%3E");
            `);
            shareIcon.addEventListener('click', (e) => {
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
                        active += 1;
                        if (tracks.length <= active) {
                          chrome.runtime.onMessage.removeListener(listener);
                          return;
                        }

                        const audiosToDownload = JSON.parse(tracks[ active ].getAttribute(dataAttr));

                        getUrlMp3(audiosToDownload.fullId + '_' + audiosToDownload.track_addon, (data) => {
                          const url = parseMp3(data);
                          if (url) {
                            url.then(link => chrome.runtime.sendMessage({
                              action: 'playVKAudio.loadNextRes',
                              link,
                              active
                            }), () => {
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

            actions.appendChild(shareIcon);

            const parser = new DOMParser();
            const baloonDocument = parser.parseFromString('<div class="tt_w tt_black toleft tt_down" style="position: absolute; opacity: 1; top: -27px; left: 18px; pointer-events: auto; display: block;"><div class="tt_text">Stream to Kodi</div></div>', 'text/html')
            const baloon = baloonDocument.body.firstChild;

            shareIcon.addEventListener('mouseenter', () => actions.appendChild(baloon));
            shareIcon.addEventListener('mouseleave', () => actions.removeChild(baloon));
          }
        }
      }
    });
  }).observe(audio, {
    childList: true,
    subtree: true,
  });
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
