(function(window, undefined) {

'use strict';

var AudioPlayer = (function() {

  // Player vars!
  var
  docTitle = document.title,
  player   = document.getElementById('ap'),
  playBtn,
  playSvg,
  playSvgPath,
  prevBtn,
  nextBtn,
  plBtn,
  repeatBtn,
  volumeBtn,
  progressBar,
  preloadBar,
  curTime,
  durTime,
  trackTitle,
  audio,
  index = 0,
  playList,
  volumeBar,
  imgCover,
  wheelVolumeValue = 0,
  volumeLength,
  repeating = false,
  seeking = false,
  seekingVol = false,
  rightClick = false,
  apActive = false,
  // playlist vars
  pl,
  plUl,
  plLi,
  tplList =
            '<li class="pl-list" data-track="{count}">'+
              '<div class="pl-list__track">'+
                '<div class="pl-list__icon"></div>'+
                '<div class="pl-list__eq">'+
                  '<div class="eq">'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                  '</div>'+
                '</div>'+
              '</div>'+
              '<div class="pl-list__title">{title}</div>'+
              '<button class="pl-list__remove">'+
                '<svg fill="#000000" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">'+
                    '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>'+
                    '<path d="M0 0h24v24H0z" fill="none"/>'+
                '</svg>'+
              '</button>'+
            '</li>',
  // settings
  settings = {
    volume        : 1,
    changeDocTitle: true,
    confirmClose  : true,
    autoPlay      : false,
    buffered      : true,
    notification  : true,
    playList      : []
  };

  function init(options) {

    if(!('classList' in document.documentElement)) {
      return false;
    }

    if(apActive || player === null) {
      return 'Player already init';
    }

    settings = extend(settings, options);

    // get player elements
    playBtn        = player.querySelector('.ap__controls--toggle');
    playSvg        = playBtn.querySelector('.icon-play');
    playSvgPath    = playSvg.querySelector('path');
    prevBtn        = player.querySelector('.ap__controls--prev');
    nextBtn        = player.querySelector('.ap__controls--next');
    repeatBtn      = player.querySelector('.ap__controls--repeat');
    volumeBtn      = player.querySelector('.volume-btn');
    plBtn          = player.querySelector('.ap__controls--playlist');
    curTime        = player.querySelector('.track__time--current');
    durTime        = player.querySelector('.track__time--duration');
    trackTitle     = player.querySelector('.track__title');
    progressBar    = player.querySelector('.progress__bar');
    preloadBar     = player.querySelector('.progress__preload');
    volumeBar      = player.querySelector('.volume__bar');
    imgCover       = player.querySelector('.image__cover');

    playList = settings.playList;
    playBtn.addEventListener('click', playToggle, false);
    volumeBtn.addEventListener('click', volumeToggle, false);
    repeatBtn.addEventListener('click', repeatToggle, false);

    progressBar.closest('.progress-container').addEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').addEventListener('mousemove', seek, false);

    document.documentElement.addEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').addEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').addEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').addEventListener(wheel(), setVolume, false);

    prevBtn.addEventListener('click', prev, false);
    nextBtn.addEventListener('click', next, false);

    apActive = true;

    // Create playlist
    renderPL();
    plBtn.addEventListener('click', plToggle, false);

    // Create audio object
    audio = new Audio();
    audio.volume = settings.volume;
    audio.preload = 'auto';

    audio.addEventListener('error', errorHandler, false);
    audio.addEventListener('timeupdate', timeUpdate, false);
    audio.addEventListener('ended', doEnd, false);

    volumeBar.style.height = audio.volume * 100 + '%';
    volumeLength = volumeBar.css('height');

    if(settings.confirmClose) {
      window.addEventListener("beforeunload", beforeUnload, false);
    }

    if(isEmptyList()) {
      return false;
    }
    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;
    imgCover.innerHTML = '<img src='+playList[index].cover+'>';

    if(settings.autoPlay) {
      audio.play();
      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
      plLi[index].classList.add('pl-list--current');
      notify(playList[index].title, {
        icon: playList[index].icon,
        body: 'Now playing'
      });
    }
  }

  function changeDocumentTitle(title) {
    if(settings.changeDocTitle) {
      if(title) {
        document.title = title;
      }
      else {
        document.title = docTitle;
      }
    }
  }

  function beforeUnload(evt) {
    if(!audio.paused) {
      var message = 'Music still playing';
      evt.returnValue = message;
      return message;
    }
  }

  function errorHandler(evt) {
    if(isEmptyList()) {
      return;
    }
    var mediaError = {
      '1': 'MEDIA_ERR_ABORTED',
      '2': 'MEDIA_ERR_NETWORK',
      '3': 'MEDIA_ERR_DECODE',
      '4': 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    };
    audio.pause();
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    plLi[index] && plLi[index].classList.remove('pl-list--current');
    changeDocumentTitle();
    throw new Error('Houston we have a problem: ' + mediaError[evt.target.error.code]);
  }

/**
 * UPDATE PL
 */
  function updatePL(addList) {
    if(!apActive) {
      return 'Player is not yet initialized';
    }
    if(!Array.isArray(addList)) {
      return;
    }
    if(addList.length === 0) {
      return;
    }

    var count = playList.length;
    var html  = [];
    playList.push.apply(playList, addList);
    addList.forEach(function(item) {
      html.push(
        tplList.replace('{count}', count++).replace('{title}', item.title)
      );
    });
    // If exist empty message
    if(plUl.querySelector('.pl-list--empty')) {
      plUl.removeChild( pl.querySelector('.pl-list--empty') );
      audio.src = playList[index].file;
      trackTitle.innerHTML = playList[index].title;
      imgCover.innerHTML = '<img src='+playList[index].cover+'>';
    }
    // Add song into playlist
    plUl.insertAdjacentHTML('beforeEnd', html.join(''));
    plLi = pl.querySelectorAll('li');
  } 

/**
 *  PlayList methods
 */
    function renderPL() {
      var html = [];

      playList.forEach(function(item, i) {
        html.push(
          tplList.replace('{count}', i).replace('{title}', item.title)
        );
      });

      pl = create('div', {
        'className': 'pl-container',
        'id': 'pl',
        'innerHTML': '<ul class="pl-ul">' + (!isEmptyList() ? html.join('') : '<li class="pl-list--empty">PlayList is empty</li>') + '</ul>'
      });

      player.parentNode.insertBefore(pl, player.nextSibling);

      plUl = pl.querySelector('.pl-ul');
      plLi = plUl.querySelectorAll('li');

      pl.addEventListener('click', listHandler, false);
    }

    function listHandler(evt) {
      evt.preventDefault();

      if(evt.target.matches('.pl-list__title')) {
        var current = parseInt(evt.target.closest('.pl-list').getAttribute('data-track'), 10);
        if(index !== current) {
          index = current;
          play(current);
        }
        else {
          playToggle();
        }
      }
      else {
          if(!!evt.target.closest('.pl-list__remove')) 
          {
            var parentEl = evt.target.closest('.pl-list');
            var isDel = parseInt(parentEl.getAttribute('data-track'), 10);

            playList.splice(isDel, 1);
            parentEl.closest('.pl-ul').removeChild(parentEl);

            plLi = pl.querySelectorAll('li');

            [].forEach.call(plLi, function(el, i) {
              el.setAttribute('data-track', i);
            });

            if(!audio.paused) {

              if(isDel === index) {
                play(index);
              }

            }
            else {
              if(isEmptyList()) {
                clearAll();
              }
              else {
                if(isDel === index) {
                  if(isDel > playList.length - 1) {
                    index -= 1;
                  }
                  audio.src = playList[index].file;
                  trackTitle.innerHTML = playList[index].title;
                  imgCover.innerHTML = '<img src='+playList[index].cover+'>';

                  progressBar.style.width = 0;
                }
              }
            }
            if(isDel < index) {
              index--;
            }
          }

      }
    }

    function plActive() {
      if(audio.paused) {
        plLi[index].classList.remove('pl-list--current');
        return;
      }
      var current = index;
      for(var i = 0, len = plLi.length; len > i; i++) {
        plLi[i].classList.remove('pl-list--current');
      }
      plLi[current].classList.add('pl-list--current');
    }


/**
 * Player methods
 */
  function play(currentIndex) {

    if(isEmptyList()) {
      return clearAll();
    }

    index = (currentIndex + playList.length) % playList.length;

    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;
    imgCover.innerHTML = '<img src='+playList[index].cover+'>';
    // Change document title
    changeDocumentTitle(playList[index].title);

    // Audio play
    audio.play();

    // Show notification
    notify(playList[index].title, {
      icon: playList[index].icon,
      body: 'Now playing',
      tag: 'music-player'
    });

    // Toggle play button
    playBtn.classList.add('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));

    // Set active song playlist
    plActive();
  }

  function prev() {
    play(index - 1);
  }

  function next() {
    play(index + 1);
  }

  function isEmptyList() {
    return playList.length === 0;
  }

  function clearAll() {
    audio.pause();
    audio.src = '';
    trackTitle.innerHTML = 'queue is empty';
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    if(!plUl.querySelector('.pl-list--empty')) {
      plUl.innerHTML = '<li class="pl-list--empty">PlayList is empty</li>';
    }
    changeDocumentTitle();
  }

  function playToggle() {
    if(isEmptyList()) {
      return;
    }
    if(audio.paused) {

      if(audio.currentTime === 0) {
        notify(playList[index].title, {
          icon: playList[index].icon,
          body: 'Now playing'
        });
      }
      changeDocumentTitle(playList[index].title);

      audio.play();

      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
    }
    else {
      changeDocumentTitle();
      audio.pause();
      playBtn.classList.remove('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    }
    plActive();
  }

  function volumeToggle() {
    if(audio.muted) {
      if(parseInt(volumeLength, 10) === 0) {
        volumeBar.style.height = settings.volume * 100 + '%';
        audio.volume = settings.volume;
      }
      else {
        volumeBar.style.height = volumeLength;
      }
      audio.muted = false;
      volumeBtn.classList.remove('has-muted');
    }
    else {
      audio.muted = true;
      volumeBar.style.height = 0;
      volumeBtn.classList.add('has-muted');
    }
  }

  function repeatToggle() {
    if(repeatBtn.classList.contains('is-active')) {
      repeating = false;
      repeatBtn.classList.remove('is-active');
    }
    else {
      repeating = true;
      repeatBtn.classList.add('is-active');
    }
  }

  function plToggle() {
    plBtn.classList.toggle('is-active');
    pl.classList.toggle('h-show');
  }

  function timeUpdate() {
    if(audio.readyState === 0 || seeking) return;

    var barlength = Math.round(audio.currentTime * (100 / audio.duration));
    progressBar.style.width = barlength + '%';

    var
    curMins = Math.floor(audio.currentTime / 60),
    curSecs = Math.floor(audio.currentTime - curMins * 60),
    mins = Math.floor(audio.duration / 60),
    secs = Math.floor(audio.duration - mins * 60);
    (curSecs < 10) && (curSecs = '0' + curSecs);
    (secs < 10) && (secs = '0' + secs);

    curTime.innerHTML = curMins + ':' + curSecs;
    durTime.innerHTML = mins + ':' + secs;

    if(settings.buffered) {
      var buffered = audio.buffered;
      if(buffered.length) {
        var loaded = Math.round(100 * buffered.end(0) / audio.duration);
        preloadBar.style.width = loaded + '%';
      }
    }
  }

  /**
   * TODO shuffle
   */
  function shuffle() {
    if(shuffle) {
      index = Math.round(Math.random() * playList.length);
    }
  }

  function doEnd() {
    if(index === playList.length - 1) {
      if(!repeating) {
        audio.pause();
        plActive();
        playBtn.classList.remove('is-playing');
        playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
        return;
      }
      else {
        play(0);
      }
    }
    else {
      play(index + 1);
    }
  }

  function moveBar(evt, el, dir) {
    var value;
    if(dir === 'horizontal') {
      value = Math.round( ((evt.clientX - el.offset().left) + window.pageXOffset)  * 100 / el.parentNode.offsetWidth);
      el.style.width = value + '%';
      return value;
    }
    else {
      if(evt.type === wheel()) {
        value = parseInt(volumeLength, 10);
        var delta = evt.deltaY || evt.detail || -evt.wheelDelta;
        value = (delta > 0) ? value - 10 : value + 10;
      }
      else {
        var offset = (el.offset().top + el.offsetHeight) - window.pageYOffset;
        value = Math.round((offset - evt.clientY));
      }
      if(value > 100) value = wheelVolumeValue = 100;
      if(value < 0) value = wheelVolumeValue = 0;
      volumeBar.style.height = value + '%';
      return value;
    }
  }

  function handlerBar(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seeking = true;
    !rightClick && progressBar.classList.add('progress__bar--active');
    seek(evt);
  }

  function handlerVol(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seekingVol = true;
    setVolume(evt);
  }

  function seek(evt) {
    evt.preventDefault();
    if(seeking && rightClick === false && audio.readyState !== 0) {
      window.value = moveBar(evt, progressBar, 'horizontal');
    }
  }

  function seekingFalse() {
    if(seeking && rightClick === false && audio.readyState !== 0) {
      audio.currentTime = audio.duration * (window.value / 100);
      progressBar.classList.remove('progress__bar--active');
    }
    seeking = false;
    seekingVol = false;
  }

  function setVolume(evt) {
    evt.preventDefault();
    volumeLength = volumeBar.css('height');
    if(seekingVol && rightClick === false || evt.type === wheel()) {
      var value = moveBar(evt, volumeBar.parentNode, 'vertical') / 100;
      if(value <= 0) {
        audio.volume = 0;
        audio.muted = true;
        volumeBtn.classList.add('has-muted');
      }
      else {
        if(audio.muted) audio.muted = false;
        audio.volume = value;
        volumeBtn.classList.remove('has-muted');
      }
    }
  }

  function notify(title, attr) {
    if(!settings.notification) {
      return;
    }
    if(window.Notification === undefined) {
      return;
    }
    attr.tag = 'AP music player';
    window.Notification.requestPermission(function(access) {
      if(access === 'granted') {
        var notice = new Notification(title.substr(0, 110), attr);
        setTimeout(notice.close.bind(notice), 5000);
      }
    });
  }

/* Destroy method. Clear All */
  function destroy() {
    if(!apActive) return;

    if(settings.confirmClose) {
      window.removeEventListener('beforeunload', beforeUnload, false);
    }

    playBtn.removeEventListener('click', playToggle, false);
    volumeBtn.removeEventListener('click', volumeToggle, false);
    repeatBtn.removeEventListener('click', repeatToggle, false);
    plBtn.removeEventListener('click', plToggle, false);

    progressBar.closest('.progress-container').removeEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').removeEventListener('mousemove', seek, false);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').removeEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').removeEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').removeEventListener(wheel(), setVolume);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    prevBtn.removeEventListener('click', prev, false);
    nextBtn.removeEventListener('click', next, false);

    audio.removeEventListener('error', errorHandler, false);
    audio.removeEventListener('timeupdate', timeUpdate, false);
    audio.removeEventListener('ended', doEnd, false);

    // Playlist
    pl.removeEventListener('click', listHandler, false);
    pl.parentNode.removeChild(pl);

    audio.pause();
    apActive = false;
    index = 0;

    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    volumeBtn.classList.remove('has-muted');
    plBtn.classList.remove('is-active');
    repeatBtn.classList.remove('is-active');

    // Remove player from the DOM if necessary
    // player.parentNode.removeChild(player);
  }


/**
 *  Helpers
 */
  function wheel() {
    var wheel;
    if ('onwheel' in document) {
      wheel = 'wheel';
    } else if ('onmousewheel' in document) {
      wheel = 'mousewheel';
    } else {
      wheel = 'MozMousePixelScroll';
    }
    return wheel;
  }

  function extend(defaults, options) {
    for(var name in options) {
      if(defaults.hasOwnProperty(name)) {
        defaults[name] = options[name];
      }
    }
    return defaults;
  }
  function create(el, attr) {
    var element = document.createElement(el);
    if(attr) {
      for(var name in attr) {
        if(element[name] !== undefined) {
          element[name] = attr[name];
        }
      }
    }
    return element;
  }

  Element.prototype.offset = function() {
    var el = this.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    return {
      top: el.top + scrollTop,
      left: el.left + scrollLeft
    };
  };

  Element.prototype.css = function(attr) {
    if(typeof attr === 'string') {
      return getComputedStyle(this, '')[attr];
    }
    else if(typeof attr === 'object') {
      for(var name in attr) {
        if(this.style[name] !== undefined) {
          this.style[name] = attr[name];
        }
      }
    }
  };

  // matches polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.matches = ElementPrototype.matches ||
      ElementPrototype.matchesSelector ||
      ElementPrototype.webkitMatchesSelector ||
      ElementPrototype.msMatchesSelector ||
      function(selector) {
          var node = this, nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;
          while (nodes[++i] && nodes[i] != node);
          return !!nodes[i];
      };
  }(Element.prototype);

  // closest polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.closest = ElementPrototype.closest ||
      function(selector) {
          var el = this;
          while (el.matches && !el.matches(selector)) el = el.parentNode;
          return el.matches ? el : null;
      };
  }(Element.prototype);

/**
 *  Public methods
 */
  return {
    init: init,
    update: updatePL,
    destroy: destroy
  };

})();

window.AP = AudioPlayer;

})(window);

// TEST: image for web notifications
var iconImage = 'http://funkyimg.com/i/21pX5.png';

AP.init({
  playList: [
{'icon': iconImage, 'title': 'Oliver Heldens - Ibiza 77 (Can You Feel It) (Chocolate Puma Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/334161284/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000234531563-ljt9cm-t500x500.jpg'}
      ]
});

document.getElementById('dhSongs').addEventListener('click', function(e) {
e.preventDefault();
    AP.destroy();
  AP.init({
      playList:[
{'icon': iconImage, 'title': 'Record — Новое (10-04-2020)', 'file': 'http://92.255.66.40/tmp_audio/itunes1/record_new_-_2020-04-10.mp3', 'cover': 'http://www.radiorecord.ru/upload/resize_cache/iblock/064/372_372_1/0644d524cc8bfc1470064e9c61a8287d.png'},
{'icon': iconImage, 'title': '‎Oliver Heldens presents Heldeep Radio', 'file': 'http://media.rawvoice.com/oliverheldens/media2-oliverheldens.podtree.com/media/podcast/Heldeep_Radio_303.mp3', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts123/v4/fb/7b/53/fb7b53fe-9be2-f641-c8fa-24b7fadff202/mza_9805097027995531016.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': 'Nils van Zandt - Life Of The Party (Marsal Ventura Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/756549664/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-nxrqCdPRafIBW9ho-ilx9pQ-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lost Kings - You ft. Katelyn Tarver (Evan Berg Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/256251275/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000155395705-eb8gx7-t500x500.jpg'},
{'icon': iconImage, 'title': 'Samlight & Stage Republic - Fire ', 'file': 'https://alexa-soundcloud.now.sh/stream/555251721/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000468216492-qtyrmd-t500x500.jpg'},
{'icon': iconImage, 'title': 'GRAZZE - Irish Hill', 'file': 'https://alexa-soundcloud.now.sh/stream/699511546/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000616383172-d6bhuk-t500x500.jpg'},
{'icon': iconImage, 'title': 'Siks x Adrien Toma - Get Funky', 'file': 'https://alexa-soundcloud.now.sh/stream/564465879/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000477671559-5p1tjy-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dont Say', 'file': 'https://alexa-soundcloud.now.sh/stream/679996652/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000596606570-14eoyf-t500x500.jpg'},
{'icon': iconImage, 'title': 'Martin Garrix & Matisse & Sadko feat. Michel Zitron - Hold On', 'file': 'https://alexa-soundcloud.now.sh/stream/734493388/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000658868071-e59l2h-t500x500.jpg'},
{'icon': iconImage, 'title': 'Enamour - Ruby (miru Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/771220843/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-yKejSLrsX0qFjQ52-uMUqIQ-t500x500.jpg'},
{'icon': iconImage, 'title': 'LOUD ABOUT US! - Drums', 'file': 'https://alexa-soundcloud.now.sh/stream/329656757/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000230174487-ihw0a9-t500x500.jpg'},
{'icon': iconImage, 'title': 'Matthias Vogt - Matters feat. Phil Fill (El_Txef_A Live From The Elephant Room)', 'file': 'https://alexa-soundcloud.now.sh/stream/267101991/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000165543521-h246sz-t500x500.jpg'},
{'icon': iconImage, 'title': 'Aiiso - Hopeful For A Sign', 'file': 'https://alexa-soundcloud.now.sh/stream/317181731/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000217307367-eyzhle-t500x500.jpg'},
{'icon': iconImage, 'title': 'Esteble - Soaring', 'file': 'https://alexa-soundcloud.now.sh/stream/268450830/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000166783700-eto4i2-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jerome Price - Nobody (ft. Karen Harding)', 'file': 'https://alexa-soundcloud.now.sh/stream/308237106/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000208289114-lemw7a-t500x500.jpg'},
{'icon': iconImage, 'title': 'Pickle - Body Work ', 'file': 'https://alexa-soundcloud.now.sh/stream/601354542/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000515527677-0hsjzd-t500x500.jpg'},
{'icon': iconImage, 'title': 'Braxton - When The Sun Goes Down', 'file': 'https://alexa-soundcloud.now.sh/stream/575194239/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000488728434-rksbk4-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ferreck Dawn - Higher ', 'file': 'https://alexa-soundcloud.now.sh/stream/301679490/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000201919172-lu61j2-t500x500.jpg'},
{'icon': iconImage, 'title': 'Redondo & Bolier ft. She Keeps Bees - Every Single Piece (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/196115447/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000110186273-wt2sfa-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dave Silcox & Kvdos -  Broken Promises (ft. Little Nikki)', 'file': 'https://alexa-soundcloud.now.sh/stream/291513875/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000192086393-bpxppp-t500x500.jpg'},
{'icon': iconImage, 'title': 'Grey Fox - Innocent [Track Of The Week 42]', 'file': 'https://alexa-soundcloud.now.sh/stream/288644585/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000189288350-9dw550-t500x500.jpg'},
{'icon': iconImage, 'title': 'Madison Mars - Down', 'file': 'https://alexa-soundcloud.now.sh/stream/264712874/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000163378857-ljv88o-t500x500.jpg'},
{'icon': iconImage, 'title': 'miru - Radiance', 'file': 'https://alexa-soundcloud.now.sh/stream/754429330/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-JSKH84zClseG3Uuy-sNy78A-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jay Rocha - Take It Higher (Original Mix) [Talentpool Track of the Week 44]', 'file': 'https://alexa-soundcloud.now.sh/stream/230161329/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000134004821-556fiq-t500x500.jpg'},
{'icon': iconImage, 'title': 'Tru Concept x JLV x Nu Aspect - Love You No More', 'file': 'https://alexa-soundcloud.now.sh/stream/373118339/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000273833870-3w2e8n-t500x500.jpg'},
{'icon': iconImage, 'title': 'Cash Cash - Devil (feat. Busta Rhymes B.o.B Neon Hitch) (Paris & Simo Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/225955353/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000130978160-wt3d0c-t500x500.jpg'},
{'icon': iconImage, 'title': 'Cash Cash - Take Me Home (feat. Bebe Rexha) (Tarros Big Beat 5th Anniversary Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/238012224/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000139931029-ru99hu-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jaded x Black Caviar x Antony & Cleopatra - Slippin', 'file': 'https://alexa-soundcloud.now.sh/stream/577383759/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000490995447-b8je0m-t500x500.jpg'},
{'icon': iconImage, 'title': 'Janelle Monae - Primetime (feat. Miguel)', 'file': 'https://alexa-soundcloud.now.sh/stream/116596513/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'ul'},
{'icon': iconImage, 'title': 'Swan - Love U (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/161773274/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000087182551-61f8ni-t500x500.jpg'},
{'icon': iconImage, 'title': 'Bing Crosby - White Christmas (Kaskade Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/7510731/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000003304198-eoyteg-t500x500.jpg'},
{'icon': iconImage, 'title': '10 The Key', 'file': 'https://alexa-soundcloud.now.sh/stream/149367183/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000079338272-v8c6q3-t500x500.jpg'},
{'icon': iconImage, 'title': 'Kris Kross Amsterdam x Ally Brooke x Messiah - VГЎmonos (LNY TNZ Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/590397186/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000504340740-piyro6-t500x500.jpg'},
{'icon': iconImage, 'title': 'Janelle Monae - Make Me Feel (EDXs Dubai Skyline Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/429114234/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000334703175-pfejol-t500x500.jpg'},
{'icon': iconImage, 'title': 'Robin Schulz - Speechless (feat. Erika Sirola) (Lucas & Steve Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/543322686/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-W9NGPsKMHavi-0-t500x500.jpg'},
{'icon': iconImage, 'title': 'Antic - And I Pray', 'file': 'https://alexa-soundcloud.now.sh/stream/343540012/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000243845953-ety3bz-t500x500.jpg'},
{'icon': iconImage, 'title': 'Arina Mur - Magic Wand', 'file': 'https://alexa-soundcloud.now.sh/stream/672761240/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000589341878-4kz9xw-t500x500.jpg'},
{'icon': iconImage, 'title': 'Compuphonic - Medicis', 'file': 'https://alexa-soundcloud.now.sh/stream/344572099/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000244856053-31r2qi-t500x500.jpg'},
{'icon': iconImage, 'title': 'The Mary Nixons вЂ“ Adrian', 'file': 'https://alexa-soundcloud.now.sh/stream/333178591/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000233606536-fnwjjl-t500x500.jpg'},
{'icon': iconImage, 'title': 'Calvin Harris & Example - Well Be Coming Back (R3hab EDC Vegas Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/51183805/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000025808166-f6lftk-t500x500.jpg'},
{'icon': iconImage, 'title': 'B.o.B - Back And Forth (Boehm Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/232662667/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000135849743-jnal48-t500x500.jpg'},
{'icon': iconImage, 'title': 'Bougenvilla ft. LZRZ - No Sleep (Sonny Bass & Jordi Rivera Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/345478750/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000245719178-2mlggi-t500x500.jpg'},
{'icon': iconImage, 'title': 'Oliver Heldens & MOGUAI - Cucumba ', 'file': 'https://alexa-soundcloud.now.sh/stream/621598134/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000536093244-eiuv47-t500x500.jpg'},
{'icon': iconImage, 'title': 'TripL - Never Gonna Give You Up', 'file': 'https://alexa-soundcloud.now.sh/stream/748278292/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000672979600-yohsy1-t500x500.jpg'},
{'icon': iconImage, 'title': ': Markus Schulz feat. Soundland - Facedown (Going Deeper Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/285985349/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000186519961-6ns207-t500x500.jpg'},
{'icon': iconImage, 'title': 'Luttrell - Away', 'file': 'https://alexa-soundcloud.now.sh/stream/276951937/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000174999010-dbgpcn-t500x500.jpg'},
{'icon': iconImage, 'title': 'Sam Feldt & De Hofnar feat. Henk Westbroek - Zolang Ik Jou Heb (World Premiere 3FM Radio)', 'file': 'https://alexa-soundcloud.now.sh/stream/155939486/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000083363592-gy8v4i-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jacob A & Neevald - Everythings Alright (Going Deeper Remix) !', 'file': 'https://alexa-soundcloud.now.sh/stream/147055309/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000357385032-v2xnmo-t500x500.jpg'},
{'icon': iconImage, 'title': 'SLATIN - Apple Juice (feat. Carla Monroe) [Zhou Remix]', 'file': 'https://alexa-soundcloud.now.sh/stream/540917937/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000454343751-gqta6a-t500x500.jpg'},
{'icon': iconImage, 'title': 'Endego - Double Tap ', 'file': 'https://alexa-soundcloud.now.sh/stream/348188183/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000248455724-y7edls-t500x500.jpg'},
{'icon': iconImage, 'title': 'R3hab & Trevor Guthrie - Soundwave (Quintino Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/177320468/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000097426492-uqu4tp-t500x500.jpg'},
{'icon': iconImage, 'title': 'Peace Love Happiness (Acid Reprise)', 'file': 'https://alexa-soundcloud.now.sh/stream/774043033/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-bYdCWhIzJfXTshW3-QMO9qQ-t500x500.jpg'},
{'icon': iconImage, 'title': 'Radio Silence (King Arthur Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/557524989/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000470441337-ndsh9y-t500x500.jpg'},
{'icon': iconImage, 'title': 'Teddybears - Get Fresh With You feat. Laza Morgan', 'file': 'https://alexa-soundcloud.now.sh/stream/17578595/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000008471199-2r6o50-t500x500.jpg'},
{'icon': iconImage, 'title': 'Don Diablo & Marnik - Children Of A Miracle', 'file': 'https://alexa-soundcloud.now.sh/stream/313273810/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000213433076-jnqdwp-t500x500.jpg'},
{'icon': iconImage, 'title': 'Calvin Harris & R3hab - Burnin', 'file': 'https://alexa-soundcloud.now.sh/stream/171415774/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000093467346-u2cmwe-t500x500.jpg'},
{'icon': iconImage, 'title': 'HI-LO & ALOK - Alien Technology ', 'file': 'https://alexa-soundcloud.now.sh/stream/336825991/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000237252136-bdo7ua-t500x500.jpg'},
{'icon': iconImage, 'title': 'MOGUAI Vs. Macon - I Like It ', 'file': 'https://alexa-soundcloud.now.sh/stream/475507767/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000378044991-k4rwpz-t500x500.jpg'},
]})
});
document.getElementById('trSongs').addEventListener('click', function(e) {e.preventDefault();AP.destroy();AP.init({playList:[
{'icon': iconImage, 'title': 'Feel ', 'file': 'http://92.255.66.40/tmp_audio/itunes1/feel_-_rc_2020-04-07_320.mp3', 'cover': 'https://cdn.promodj.com/afs/6c4e618a688a45f6aa65ccba6020190512:resize:900x900:same:promodj:e9011b'},
{'icon': iconImage, 'title': 'A State of Trance 453', 'file': 'https://archive.org/download/Armin_van_Buuren_A_State_of_Trance_001-499/Armin_van_Buuren_A_State_of_Trance_Episode_453.mp3', 'cover': 'https://d1fuks2cnuq5t9.cloudfront.net/i/6WKc8vl3oVtDb8iePwyNaIXoIncsAa2wC2Z6dYgi.jpg'},
{'icon': iconImage, 'title': 'LoCo - Out In The Field', 'file': 'https://alexa-soundcloud.now.sh/stream/121810404/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000063670753-9mnwmt-t500x500.jpg'},
{'icon': iconImage, 'title': 'Underwater (Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/255867670/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-Cb01F229wWwo-0-t500x500.png'},
{'icon': iconImage, 'title': 'FSOE #626 by Aly & Fila: Ciro Visone & Semper T. - Emotional Fluid (Original Mix) [TAR#138]', 'file': 'https://alexa-soundcloud.now.sh/stream/719660332/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000644192353-s3vqhv-t500x500.jpg'},
{'icon': iconImage, 'title': 'Euphoric Feel - The Last Strike (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/133941346/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000070393530-ckdtl6-t500x500.jpg'},
{'icon': iconImage, 'title': 'UCast - Gearbox *!*', 'file': 'https://alexa-soundcloud.now.sh/stream/253908667/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000152877636-udtrpv-t500x500.jpg'},
{'icon': iconImage, 'title': 'Daya', 'file': 'https://alexa-soundcloud.now.sh/stream/386214998/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000287806169-9yg1pt-t500x500.jpg'},
{'icon': iconImage, 'title': 'PureNRG - Prophecy [Istoria 2017 Anthem] (Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/305738515/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000205888790-2uvxu6-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ahmed Romel - Sea Of Sounds [Taken from RГњYA Artist Album]', 'file': 'https://alexa-soundcloud.now.sh/stream/662869379/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000579454070-arj4he-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ferry Corsten - Sweet Sorrow (Extended)', 'file': 'https://alexa-soundcloud.now.sh/stream/204005399/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000115694998-qekx3f-t500x500.jpg'},
{'icon': iconImage, 'title': 'Airbase - Epoch (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/230307494/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000134111008-jdetjq-t500x500.jpg'},
{'icon': iconImage, 'title': 'Morttagua - 7th Sense (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/234493635/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000137202898-h2rtyi-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jaytech - Red Planet', 'file': 'https://alexa-soundcloud.now.sh/stream/344575985/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000244862497-6l5haz-t500x500.jpg'},
{'icon': iconImage, 'title': 'Factor B - Sacrosanct (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/230450599/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000134215936-0hkcmk-t500x500.jpg'},
{'icon': iconImage, 'title': 'Corin Bayley - Static Shock [FSOE Clandestine]', 'file': 'https://alexa-soundcloud.now.sh/stream/485933778/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000389502258-pc34g9-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ron with Leeds - Fading You (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/330580848/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000231026932-iud1v9-t500x500.jpg'},
{'icon': iconImage, 'title': 'The Thrillseekers with Stine Grove - How Will I Know (Club Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/389439348/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000291095421-um0sv4-t500x500.jpg'},
{'icon': iconImage, 'title': 'Will Atkinson & Rowetta - Mesmerise *!*', 'file': 'https://alexa-soundcloud.now.sh/stream/231260012/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000134822814-hhvmfp-t500x500.jpg'},
{'icon': iconImage, 'title': 'Darren Porter & Alessandra Roncone - Transcendence', 'file': 'https://alexa-soundcloud.now.sh/stream/374293184/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000274995602-63vv4c-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Bonnie McKee - Lonely For You (ReOrder Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/590616852/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-6JV0mJTze4f8-0-t500x500.png'},
{'icon': iconImage, 'title': 'Andy Moor & Somna Feat. Amy Kirkpatrick - One Thing About You (Andy Moors Eco Mix) (Out Now!!)', 'file': 'https://alexa-soundcloud.now.sh/stream/203737541/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000115493130-ya33wq-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVA162 - Andy Moor & Somna - Look Back (LTN Remix) *Out Now!*', 'file': 'https://alexa-soundcloud.now.sh/stream/304088629/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000204246099-0fq4vg-t500x500.jpg'},
{'icon': iconImage, 'title': 'FSOE #489 by Aly & Fila: Greg Dusten - EOV', 'file': 'https://alexa-soundcloud.now.sh/stream/317652794/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000217768577-7cua6h-t500x500.jpg'},
{'icon': iconImage, 'title': 'Namatjira - Illuminar (Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/295306763/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000195879989-8jyr79-t500x500.jpg'},
{'icon': iconImage, 'title': 'Antrim & Kamilo Sanclemente Feat. Paula OS - Once And Again [FSOE UV]', 'file': 'https://alexa-soundcloud.now.sh/stream/470727195/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000372929391-1zlqd9-t500x500.jpg'},
{'icon': iconImage, 'title': 'John OCallaghan feat. Audrey Gallagher - Big Sky (EDXs Russian winter remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/289291547/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-kMcY8Z9f8PGz-0-t500x500.png'},
{'icon': iconImage, 'title': '[!] Andy Kern - Aurora (Original Mix) [TAR#138]', 'file': 'https://alexa-soundcloud.now.sh/stream/691734523/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000608302747-8ulqo9-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jordi Roure - Planetarium', 'file': 'https://alexa-soundcloud.now.sh/stream/297896879/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000198412659-yncijj-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lane 8 - Ghost ft. Patrick Baker (Lane 8 Rework)', 'file': 'https://alexa-soundcloud.now.sh/stream/206054673/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000117209164-ogg4ib-t500x500.jpg'},
{'icon': iconImage, 'title': 'John OCallaghan - Stresstest (Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/289303177/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-NrJdBAh1uLMw-0-t500x500.png'},
{'icon': iconImage, 'title': 'Sunny Lax - Alliance', 'file': 'https://alexa-soundcloud.now.sh/stream/589938222/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000503888838-wmjc9n-t500x500.jpg'},
{'icon': iconImage, 'title': 'Above & Beyond feat. ZoeМ€ Johnston - Theres Only You (Above & Beyond Club Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/628864020/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000543843717-vs8fxo-t500x500.jpg'},
{'icon': iconImage, 'title': 'Guess Whos Back (Radio Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/206023876/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-9Jn4Y9e0r8eD-0-t500x500.png'},
{'icon': iconImage, 'title': 'Dominik von Francois - Strogressive', 'file': 'https://alexa-soundcloud.now.sh/stream/97320090/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000050838219-dn1h9y-t500x500.jpg'},
{'icon': iconImage, 'title': 'Alex Leavon - Ruffle Things *!*', 'file': 'https://alexa-soundcloud.now.sh/stream/259234135/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000158313449-d1hxc7-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ahmed Romel Feat. Simon OShine - The Love Potion [Taken from RГњYA Artist Album]', 'file': 'https://alexa-soundcloud.now.sh/stream/662869556/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000579454238-o9wtcu-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gunslinger - Deep', 'file': 'https://alexa-soundcloud.now.sh/stream/246343557/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000146593655-7efytw-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gabriel & Dresden feat Jan Burton - Dangerous Power (Radio Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/197360145/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000111044873-tyim2l-t500x500.jpg'},
{'icon': iconImage, 'title': 'Tasso - Dont Believe [FSOE Clandestine]', 'file': 'https://alexa-soundcloud.now.sh/stream/451223733/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000354500061-3cay72-t500x500.jpg'},
{'icon': iconImage, 'title': 'Above & Beyond feat. Richard Bedford - Happiness Amplified', 'file': 'https://alexa-soundcloud.now.sh/stream/508945998/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000414461454-0ojub9-t500x500.jpg'},
{'icon': iconImage, 'title': 'Leolife - Phantom (Physical Phase Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/136495041/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000071772519-u92ieg-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Laura V - Drowning (Avicii Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/283998751/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-ZifvkVllKLzg-0-t500x500.png'},
{'icon': iconImage, 'title': 'Roger Shah & DJ Feel Feat Zara Taylor - One Life (Kir Tender Remix) [ASOT759]', 'file': 'https://alexa-soundcloud.now.sh/stream/259819196/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000158865404-1g08z2-t500x500.jpg'},
{'icon': iconImage, 'title': 'VONYC Sessions #323: Michele Cecchi - Isla Dorada (Liquid Vision pres. Likwid Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/73384879/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000037431579-5tmp7t-t500x500.jpg'},
{'icon': iconImage, 'title': 'Grum feat. Dom Youdan - Tomorrow (Future Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/759958723/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-44BSy0Vut1mwj0tI-RLT7eA-t500x500.jpg'},
{'icon': iconImage, 'title': 'Deeper Love (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/179457811/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-aiymrbAdUoWN-0-t500x500.png'},
{'icon': iconImage, 'title': 'John Askew - Nail Gun (Greg Downey Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/179623482/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000098975567-esnags-t500x500.jpg'},
{'icon': iconImage, 'title': 'Erik Iker & Ikerya Project  - Arctic Sunset', 'file': 'https://alexa-soundcloud.now.sh/stream/111425761/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000058241068-zvn0gz-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVA260 - Francesco Sambero & Chris Giuliano - Till The Sun *Out March 1st*', 'file': 'https://alexa-soundcloud.now.sh/stream/580720911/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000494207604-bd6zjn-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ferry Corsten - So Good', 'file': 'https://alexa-soundcloud.now.sh/stream/16442840/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000011238181-qrmo0y-t500x500.jpg'},
{'icon': iconImage, 'title': 'Anderholm - Timecode', 'file': 'https://alexa-soundcloud.now.sh/stream/480572328/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000383496975-2o54mg-t500x500.jpg'},
{'icon': iconImage, 'title': 'Tim Mason - Aalto', 'file': 'https://alexa-soundcloud.now.sh/stream/353822720/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000253948529-fcy1z9-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dont You Want Me 2015 (Classic Long Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/199832614/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-Z7QUzrllpVU5-0-t500x500.png'},
{'icon': iconImage, 'title': 'Kamilo Sanclemente & Juan Pablo Torrez - Kalopsya', 'file': 'https://alexa-soundcloud.now.sh/stream/567121533/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000480291675-12w02s-t500x500.jpg'},
{'icon': iconImage, 'title': 'R.I.C.O - Domino', 'file': 'https://alexa-soundcloud.now.sh/stream/113363590/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000059076547-aw4qav-t500x500.jpg'},
{'icon': iconImage, 'title': 'Solaris International #360 by Solarstone: Allen Watts - Out Of Reach (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/98007008/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000051230184-xcwh7g-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Ray Wilson - Yet Another Day (Sunday 5PM Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/289297202/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-r8G17AcxqZ6M-0-t500x500.png'},
]})
});
document.getElementById('rrSongs').addEventListener('click', function(e) {e.preventDefault();AP.destroy();AP.init({playList:[
{'icon': iconImage, 'title': 'Топ 20 Русского Танцпола @ EHR Русские Хиты (10.04.2020) #155', 'file': 'http://promodj.com/download/6986252/%D0%A2%D0%BE%D0%BF%2020%20%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%BE%D0%B3%D0%BE%20%D0%A2%D0%B0%D0%BD%D1%86%D0%BF%D0%BE%D0%BB%D0%B0%20%40%20EHR%20%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B5%20%D0%A5%D0%B8%D1%82%D1%8B%20%2810.04.2020%29%20%23155%20%28promodj.com%29.mp3', 'cover': 'https://is2-ssl.mzstatic.com/image/thumb/Podcasts128/v4/76/ef/1d/76ef1d03-62fa-8d32-0d92-fad4f2d5d40e/mza_2461459753662334279.png/939x0w.png'},
{'icon': iconImage, 'title': 'Slider & Magnit - Anymore', 'file': 'http://promodj.com/download/6968256/Slider%20%26%20Magnit%20-%20Anymore%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Nebezao & А.Леницкий - Целуешь, прощаешь (DJ Jan White & M-DimA Extended Remix)', 'file': 'http://promodj.com/download/6973500/Nebezao%20%26%20%D0%90.%D0%9B%D0%B5%D0%BD%D0%B8%D1%86%D0%BA%D0%B8%D0%B9%20-%20%D0%A6%D0%B5%D0%BB%D1%83%D0%B5%D1%88%D1%8C%2C%20%D0%BF%D1%80%D0%BE%D1%89%D0%B0%D0%B5%D1%88%D1%8C%20%28DJ%20Jan%20White%20%26%20M-DimA%20Extended%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'СПЛОШНОЙ КАБРИОЛЕТ - Алёна Сабина & Олег Тищенко & Милалита', 'file': 'http://promodj.com/download/6983020/%D0%A1%D0%9F%D0%9B%D0%9E%D0%A8%D0%9D%D0%9E%D0%99%20%D0%9A%D0%90%D0%91%D0%A0%D0%98%D0%9E%D0%9B%D0%95%D0%A2%20-%20%D0%90%D0%BB%D1%91%D0%BD%D0%B0%20%D0%A1%D0%B0%D0%B1%D0%B8%D0%BD%D0%B0%20%26%20%D0%9E%D0%BB%D0%B5%D0%B3%20%D0%A2%D0%B8%D1%89%D0%B5%D0%BD%D0%BA%D0%BE%20%26%20%D0%9C%D0%B8%D0%BB%D0%B0%D0%BB%D0%B8%D1%82%D0%B0%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Вирус Зла', 'file': 'http://promodj.com/download/6977064/%D0%92%D0%B8%D1%80%D1%83%D1%81%20%D0%97%D0%BB%D0%B0%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Звонкий Ностальжи ( D. Anuchin Remix )', 'file': 'http://promodj.com/download/6973042/%D0%97%D0%B2%D0%BE%D0%BD%D0%BA%D0%B8%D0%B9%20%D0%9D%D0%BE%D1%81%D1%82%D0%B0%D0%BB%D1%8C%D0%B6%D0%B8%20%28%20D.%20Anuchin%20Remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Digital Base Project - Airplanes (Hudson Finally Ver.)', 'file': 'http://promodj.com/download/6834985/Digital%20Base%20Project%20-%20Airplanes%20%28Hudson%20Finally%20Ver.%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chok - I  Have To Say (Andrey Rain Remix)', 'file': 'http://promodj.com/download/6978014/Chok%20-%20I%20%20Have%20To%20Say%20%28Andrey%20Rain%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Karina Evn – Dale Dale (Eugene Star Remix) [Club Mix]', 'file': 'http://promodj.com/download/6794631/Karina%20Evn%20%E2%80%93%20Dale%20Dale%20%28Eugene%20Star%20Remix%29%20%5BClub%20Mix%5D%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Анна Филипчук - Любовь-война (Ashko remix)', 'file': 'http://promodj.com/download/6977699/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20-%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Ashko%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Darude - SANDSTORM (Meatboy remix)', 'file': 'http://promodj.com/download/6977085/Darude%20-%20SANDSTORM%20%28Meatboy%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Carlas Dreams - Seara de Seara (Miltreo Remix)', 'file': 'http://promodj.com/download/6986215/Carla%27s%20Dreams%20-%20Seara%20de%20Seara%20%28Miltreo%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'NK&Shaft - Mambo Elefante (Dj RuS)', 'file': 'http://promodj.com/download/6981820/NK%26Shaft%20-%20Mambo%20Elefante%20%28Dj%20RuS%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Y2K, bbno$ - Lalala (Mike & Eugene Star Remix) [Radio Edit.]', 'file': 'http://promodj.com/download/6986741/Y2K%2C%20bbno%24%20-%20Lalala%20%28Mike%20%26%20Eugene%20Star%20Remix%29%20%5BRadio%20Edit.%5D%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Miyagi & Andy Panda - Kosandra (Leo Burn & Kolya Dark Radio Edit)', 'file': 'http://promodj.com/download/6969881/Miyagi%20%26%20Andy%20Panda%20-%20Kosandra%20%28Leo%20Burn%20%26%20Kolya%20Dark%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Trevor Daniel x Eddie G & Misha Maklay & Jurbas - Falling (SAlANDIR Radio Version)', 'file': 'http://promodj.com/download/6976813/Trevor%20Daniel%20x%20Eddie%20G%20%26%20Misha%20Maklay%20%26%20Jurbas%20-%20Falling%20%28SAlANDIR%20Radio%20Version%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Eivor - Verd Min (DJ Antonio & DJ Renat Club Mix)', 'file': 'http://promodj.com/download/6830322/Eivor%20-%20Verd%20Min%20%28DJ%20Antonio%20%26%20DJ%20Renat%20Club%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Катя Чехова - Крылья (Level & Fila Radio Edit)', 'file': 'http://promodj.com/download/6985557/%D0%9A%D0%B0%D1%82%D1%8F%20%D0%A7%D0%B5%D1%85%D0%BE%D0%B2%D0%B0%20-%20%D0%9A%D1%80%D1%8B%D0%BB%D1%8C%D1%8F%20%28Level%20%26%20Fila%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'DJ Andry IG - Dance Love (Original Mix)', 'file': 'http://promodj.com/download/6973498/DJ%20Andry%20IG%20-%20Dance%20Love%20%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Zivert - Безболезненно (New Jent Remix)', 'file': 'http://promodj.com/download/6981427/Zivert%20-%20%D0%91%D0%B5%D0%B7%D0%B1%D0%BE%D0%BB%D0%B5%D0%B7%D0%BD%D0%B5%D0%BD%D0%BD%D0%BE%20%28New%20Jent%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Голди - Крестики-нолики (Dmitriy Smarts & Dimon Production Radio Remix)', 'file': 'http://promodj.com/download/6982961/%D0%93%D0%BE%D0%BB%D0%B4%D0%B8%20-%20%D0%9A%D1%80%D0%B5%D1%81%D1%82%D0%B8%D0%BA%D0%B8-%D0%BD%D0%BE%D0%BB%D0%B8%D0%BA%D0%B8%20%28Dmitriy%20Smarts%20%26%20Dimon%20Production%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'the weeknd - after hours [tanatov x saypex re-edit]', 'file': 'http://promodj.com/download/6970194/the%20weeknd%20-%20after%20hours%20%5Btanatov%20x%20saypex%20re-edit%5D%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'B Y L E N K O F F  #РашнПляшм 9 выпуск 2020 (promo)', 'file': 'http://promodj.com/download/6986195/B%20Y%20L%20E%20N%20K%20O%20F%20F%20%20%23%D0%A0%D0%B0%D1%88%D0%BD%D0%9F%D0%BB%D1%8F%D1%88%D0%BC%209%20%D0%B2%D1%8B%D0%BF%D1%83%D1%81%D0%BA%202020%20%28promo%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Intelligency - Август (Romis remix)', 'file': 'http://promodj.com/download/6980730/Intelligency%20-%20%D0%90%D0%B2%D0%B3%D1%83%D1%81%D1%82%20%28Romis%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'SOOWORG - Level', 'file': 'http://promodj.com/download/6982510/SOOWORG%20-%20Level%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Bengalsky feat. Нафиса Старкова – Притяжение (Maxim Keks & FuZzee Remix)(Radio Edit)', 'file': 'http://promodj.com/download/6972067/Bengalsky%20feat.%20%D0%9D%D0%B0%D1%84%D0%B8%D1%81%D0%B0%20%D0%A1%D1%82%D0%B0%D1%80%D0%BA%D0%BE%D0%B2%D0%B0%20%E2%80%93%20%D0%9F%D1%80%D0%B8%D1%82%D1%8F%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5%20%28Maxim%20Keks%20%26%20FuZzee%20Remix%29%28Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Atom Sound - Crysis (original mix)', 'file': 'http://promodj.com/download/6977784/Atom%20Sound%20-%20Crysis%20%28original%20mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'LOBODA - Новый Рим (Vincent & Diaz Remix)', 'file': 'http://promodj.com/download/6945061/LOBODA%20-%20%D0%9D%D0%BE%D0%B2%D1%8B%D0%B8%CC%86%20%D0%A0%D0%B8%D0%BC%20%28Vincent%20%26%20Diaz%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chok - I  Have To Say (Andrey Rain Ехtеndеd Remix)', 'file': 'http://promodj.com/download/6979201/Chok%20-%20I%20%20Have%20To%20Say%20%28Andrey%20Rain%20%D0%95%D1%85t%D0%B5nd%D0%B5d%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Yves V & Ilkay Sencan – Not So Bad feat. Emie (Bransboynd Remix)', 'file': 'http://promodj.com/download/6968409/Yves%20V%20%26%20Ilkay%20Sencan%20%E2%80%93%20Not%20So%20Bad%20feat.%20Emie%20%28Bransboynd%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gayazovs Brothers - По синей грусти (Eddie G & Serg Shenon Remix)', 'file': 'http://promodj.com/download/6972965/Gayazovs%20Brothers%20-%20%D0%9F%D0%BE%20%D1%81%D0%B8%D0%BD%D0%B5%D0%B9%20%D0%B3%D1%80%D1%83%D1%81%D1%82%D0%B8%20%28Eddie%20G%20%26%20Serg%20Shenon%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'The Black Eyed Peas - Lets Get It Started (Rakurs & Major Extended Remix)', 'file': 'http://promodj.com/download/6950524/The%20Black%20Eyed%20Peas%20-%20Let%27s%20Get%20It%20Started%20%28Rakurs%20%26%20Major%20Extended%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Radiosignal Music-Group - TERMINATOR 7. Hasta la vista, Baby (Radiosignal Music-Group)', 'file': 'http://promodj.com/download/6972986/Radiosignal%20Music-Group%20-%20TERMINATOR%207.%20Hasta%20la%20vista%2C%20Baby%20%28Radiosignal%20Music-Group%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': '3+1 feat. Jerry Gozie - Never give up (DEKA Remix)', 'file': 'http://promodj.com/download/6829089/3%2B1%20feat.%20Jerry%20Gozie%20-%20Never%20give%20up%20%28DEKA%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lesha Polskiy-her alone', 'file': 'http://promodj.com/download/6978643/Lesha%20Polskiy-her%20alone%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Marc Korn ft. E-Rockerz - Time After Time (Dj Ratek Mixshow)', 'file': 'http://promodj.com/download/6905293/Marc%20Korn%20ft.%20E-Rockerz%20-%20Time%20After%20Time%20%28Dj%20Ratek%20Mixshow%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chok -  I Have to Say ( AlexSmak remix )', 'file': 'http://promodj.com/download/6969325/Chok%20-%20%20I%20Have%20to%20Say%20%28%20AlexSmak%20remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'AnnnA - Пальцы пистолеты (Fresh n Funky Remix)', 'file': 'http://promodj.com/download/6867023/AnnnA%20-%20%D0%9F%D0%B0%D0%BB%D1%8C%D1%86%D1%8B%20%D0%BF%D0%B8%D1%81%D1%82%D0%BE%D0%BB%D0%B5%D1%82%D1%8B%20%28Fresh%20%27n%27%20Funky%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Calvin Harris - I Need Your Love feat Ellie Goulding ( Dj Vozgamenchuk remix )', 'file': 'http://promodj.com/download/6974483/Calvin%20Harris%20-%20I%20Need%20Your%20Love%20feat%20Ellie%20Goulding%20%28%20Dj%20Vozgamenchuk%20remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Anarchy17 - 8 марта 2020', 'file': 'http://promodj.com/download/6966299/Anarchy17%20-%208%20%D0%BC%D0%B0%D1%80%D1%82%D0%B0%202020%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Пропаганда - Мелом (Ice & Nitrex Remix)', 'file': 'http://promodj.com/download/6893626/%D0%9F%D1%80%D0%BE%D0%BF%D0%B0%D0%B3%D0%B0%D0%BD%D0%B4%D0%B0%20-%20%D0%9C%D0%B5%D0%BB%D0%BE%D0%BC%20%28Ice%20%26%20Nitrex%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Waterpool', 'file': 'http://promodj.com/download/6974835/Waterpool%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lil Nas X ft. Billy Ray Cyrus - Old Town Road (Savin & Pushkarev Remix)', 'file': 'http://promodj.com/download/6975652/Lil%20Nas%20X%20ft.%20Billy%20Ray%20Cyrus%20-%20Old%20Town%20Road%20%28Savin%20%26%20Pushkarev%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'ReMan - Cuvinte (Dj redouane dadi Club Mix)', 'file': 'http://promodj.com/download/6977153/ReMan%20-%20Cuvinte%20%28Dj%20redouane%20dadi%20Club%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'David Guetta ft. Chris Willis x Tarantino & Dyxanin - Love Is Gone (Zaks Shot)', 'file': 'http://promodj.com/download/6830299/David%20Guetta%20ft.%20Chris%20Willis%20x%20Tarantino%20%26%20Dyxanin%20-%20Love%20Is%20Gone%20%28Zak%27s%20Shot%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Andrey Pitkin - Нравится (Dmitry Dergunov Remix)', 'file': 'http://promodj.com/download/6777218/Andrey%20Pitkin%20-%20%D0%9D%D1%80%D0%B0%D0%B2%D0%B8%D1%82%D1%81%D1%8F%20%28Dmitry%20Dergunov%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'TAMERLANALENA – TAXI (Evgeniy Kosenko remix)', 'file': 'http://promodj.com/download/6970890/TAMERLANALENA%20%E2%80%93%20TAXI%20%28Evgeniy%20Kosenko%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'DNF & Dhany & Don Diablo - The Rhythm My Heart (H.D.S EDIT)', 'file': 'http://promodj.com/download/6973104/DNF%20%26%20Dhany%20%26%20Don%20Diablo%20-%20The%20Rhythm%20My%20Heart%20%28H.D.S%20EDIT%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Barinova - Самый-самый ( Dj Vozgamenchuk remix )', 'file': 'http://promodj.com/download/6981837/Barinova%20-%20%D0%A1%D0%B0%D0%BC%D1%8B%D0%B9-%D1%81%D0%B0%D0%BC%D1%8B%D0%B9%20%28%20Dj%20Vozgamenchuk%20remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Л.В.Бетховен - ЛуННая соНата (первая часть), (Dj Polkovnik - ремикс, полная версия) NEW', 'file': 'http://promodj.com/download/6718261/%D0%9B.%D0%92.%D0%91%D0%B5%D1%82%D1%85%D0%BE%D0%B2%D0%B5%D0%BD%20-%20%D0%9B%D1%83%D0%9D%D0%9D%D0%B0%D1%8F%20%D1%81%D0%BE%D0%9D%D0%B0%D1%82%D0%B0%20%28%D0%BF%D0%B5%D1%80%D0%B2%D0%B0%D1%8F%20%D1%87%D0%B0%D1%81%D1%82%D1%8C%29%2C%20%28Dj%20Polkovnik%20-%20%D1%80%D0%B5%D0%BC%D0%B8%D0%BA%D1%81%2C%20%D0%BF%D0%BE%D0%BB%D0%BD%D0%B0%D1%8F%20%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D1%8F%29%20NEW%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Zivert - Fly (Dj DoGLife remix)', 'file': 'http://promodj.com/download/6983423/Zivert%20-%20Fly%20%28Dj%20DoGLife%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Barinova — Самый-самый (RL White Remix)', 'file': 'http://promodj.com/download/6980254/Barinova%20%E2%80%94%20%D0%A1%D0%B0%D0%BC%D1%8B%D0%B9-%D1%81%D0%B0%D0%BC%D1%8B%D0%B9%20%28RL%20White%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Selena Gomez - Dance Again (LMNTRX Remix)', 'file': 'http://promodj.com/download/6971408/Selena%20Gomez%20-%20Dance%20Again%20%28LMNTRX%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Masha Luxe-Dance Journey(Original Mix)wav', 'file': 'http://promodj.com/download/6973811/Masha%20Luxe-Dance%20Journey%28Original%20Mix%29wav%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Елена Темникова - Daimne Love (Dj Mephisto & Dj Pototskiy Remix Radio Edit)', 'file': 'http://promodj.com/download/6985790/%D0%95%D0%BB%D0%B5%D0%BD%D0%B0%20%D0%A2%D0%B5%D0%BC%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2%D0%B0%20-%20Daimne%20Love%20%28Dj%20Mephisto%20%26%20Dj%20Pototskiy%20Remix%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'GunOut - Ride', 'file': 'http://promodj.com/download/6980248/GunOut%20-%20Ride%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'MOGUAI ft. Cheat Codes - Hold On (Amice Remix)', 'file': 'http://promodj.com/download/6980216/MOGUAI%20ft.%20Cheat%20Codes%20-%20Hold%20On%20%28Amice%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Анна Филипчук - Любовь-война (Veyya Remix V6)', 'file': 'http://promodj.com/download/6965900/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20-%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Veyya%20Remix%20V6%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Raiwa - Morning Dance (Original Mix)', 'file': 'http://promodj.com/download/6984938/Raiwa%20-%20Morning%20Dance%20%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'GAYAZOV$ BROTHER$ - По синей грусти (Dimax White Remix)', 'file': 'http://promodj.com/download/6971587/GAYAZOV%24%20BROTHER%24%20-%20%D0%9F%D0%BE%20%D1%81%D0%B8%D0%BD%D0%B5%D0%B9%20%D0%B3%D1%80%D1%83%D1%81%D1%82%D0%B8%20%28Dimax%20White%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
]})
});
document.getElementById('rsSongs').addEventListener('click', function(e) {e.preventDefault();AP.destroy();AP.init({playList:[
{'icon': iconImage, 'title': '‎Patterns', 'file': 'http://feeds.soundcloud.com/stream/794327899-gai-barone-patterns-383.mp3', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts1/v4/5a/80/c2/5a80c239-e89f-0b80-8c16-766b2ab360a9/mza_8811021821446734983.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Thomas Datt Podcast', 'file': 'http://www.thomasdatt.com/dattpodcast/episode170.m4a', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts123/v4/ee/de/23/eede23a1-daa2-4c05-bbdd-58e11ea8e179/mza_1750438192573706068.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Thomas Datt Podcast', 'file': 'http://www.thomasdatt.com/dattpodcast/episode170.m4a', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts123/v4/ee/de/23/eede23a1-daa2-4c05-bbdd-58e11ea8e179/mza_1750438192573706068.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Trance Evolution Podcast', 'file': 'http://feedproxy.google.com/~r/DjAndreaMazzaPodcast/~5/nYfcz2w9LPQ/episode625.mp3', 'cover': 'https://is3-ssl.mzstatic.com/image/thumb/Podcasts4/v4/40/a3/ce/40a3ce04-7db6-bf08-1a61-9043f60c5f52/mza_5309165128061752087.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Paul van Dyks VONYC Sessions Podcast', 'file': 'http://audio.thisisdistorted.com/repository/audio/episodes/V701_1_Hour_Show-1586358870506127103-MzAxNzktNjAyNDM1MDA=.m4a', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts123/v4/13/ba/6a/13ba6a5c-5032-6f1d-545f-2c3aa49a57ea/mza_16237941372195075687.png/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Above &amp; Beyond: Group Therapy', 'file': 'http://traffic.libsyn.com/anjunabeats/group-therapy-376-with-above-beyond-and-dosem.m4a', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/49/b8/3b/49b83bc2-8d26-829a-38ef-a9fe992f59dc/mza_3713017386252311615.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Record Deep', 'file': 'http://92.255.66.40/tmp_audio/itunes1/deep_-_rc_2020-04-05_320.mp3', 'cover': 'https://is2-ssl.mzstatic.com/image/thumb/Podcasts113/v4/07/e3/26/07e32669-eced-490d-1602-09e842c90f9a/mza_2161746253067108567.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎NRJ GLOBAL DANCE', 'file': 'https://globaldance.podster.fm/272/download/audio.mp3?media=rss', 'cover': 'https://is4-ssl.mzstatic.com/image/thumb/Podcasts113/v4/b2/f0/91/b2f091d1-445b-b2f9-cceb-3e86beac6c43/mza_9050707401875677841.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Russia Goes Clubbing', 'file': 'http://feeds.soundcloud.com/stream/794479168-russiagoesclubbing-episode-599.mp3', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts113/v4/f8/bf/12/f8bf1289-c97d-b830-0b7f-5187a23a4de4/mza_3240047200716232772.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Martin Eyerer´s Kling Klong Show', 'file': 'http://feeds.soundcloud.com/stream/791569615-martineyerer-kling-klong-show-282.mp3', 'cover': 'https://is4-ssl.mzstatic.com/image/thumb/Podcasts128/v4/6c/6a/1d/6c6a1d79-2110-f406-8022-66ef83a3b64e/mza_8787223403528056616.jpg/552x0w.jpg'},
]})
});