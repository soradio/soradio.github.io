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
{'icon': iconImage, 'title': 'AZ2A x Keepin It Heale - Genie In A Bottle', 'file': 'https://alexa-soundcloud.now.sh/stream/775461901/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dray - Surrender', 'file': 'https://alexa-soundcloud.now.sh/stream/767880451/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Pablo Bravas - Numb', 'file': 'https://alexa-soundcloud.now.sh/stream/760485589/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jozels - Uplifted (ft. Jon Hazel)', 'file': 'https://alexa-soundcloud.now.sh/stream/745018153/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'WATEVA - So High', 'file': 'https://alexa-soundcloud.now.sh/stream/723570073/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Zak Joshua - Figure It Out', 'file': 'https://alexa-soundcloud.now.sh/stream/701594881/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'T. Matthias - Would I Lie To You', 'file': 'https://alexa-soundcloud.now.sh/stream/660168113/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Luca Debonaire & The Giver - Put The Work In', 'file': 'https://alexa-soundcloud.now.sh/stream/647814834/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Tom Novy ft. Michael Marshall - Something Special', 'file': 'https://alexa-soundcloud.now.sh/stream/612647403/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Aleks Cameron - Be With U', 'file': 'https://alexa-soundcloud.now.sh/stream/597914601/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JYYE - Dream', 'file': 'https://alexa-soundcloud.now.sh/stream/553485588/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Where You Belong', 'file': 'https://alexa-soundcloud.now.sh/stream/503195751/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'LUМ€CKS - First Last Kiss(JYYE Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/499871061/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'RГDY & Guy Gabriel - Fair Shot', 'file': 'https://alexa-soundcloud.now.sh/stream/484966224/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'}
  ]
});

// TEST: update playlist
document.getElementById('dhSongs').addEventListener('click', function(e) {
e.preventDefault();
    AP.destroy();
  AP.init({
      playList:[
{'icon': iconImage, 'title': 'AZ2A x Keepin It Heale - Genie In A Bottle', 'file': 'https://alexa-soundcloud.now.sh/stream/775461901/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dray - Surrender', 'file': 'https://alexa-soundcloud.now.sh/stream/767880451/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Pablo Bravas - Numb', 'file': 'https://alexa-soundcloud.now.sh/stream/760485589/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jozels - Uplifted (ft. Jon Hazel)', 'file': 'https://alexa-soundcloud.now.sh/stream/745018153/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'WATEVA - So High', 'file': 'https://alexa-soundcloud.now.sh/stream/723570073/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Zak Joshua - Figure It Out', 'file': 'https://alexa-soundcloud.now.sh/stream/701594881/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'T. Matthias - Would I Lie To You', 'file': 'https://alexa-soundcloud.now.sh/stream/660168113/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Luca Debonaire & The Giver - Put The Work In', 'file': 'https://alexa-soundcloud.now.sh/stream/647814834/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Tom Novy ft. Michael Marshall - Something Special', 'file': 'https://alexa-soundcloud.now.sh/stream/612647403/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Aleks Cameron - Be With U', 'file': 'https://alexa-soundcloud.now.sh/stream/597914601/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JYYE - Dream', 'file': 'https://alexa-soundcloud.now.sh/stream/553485588/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Where You Belong', 'file': 'https://alexa-soundcloud.now.sh/stream/503195751/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'LUМ€CKS - First Last Kiss(JYYE Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/499871061/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'RГDY & Guy Gabriel - Fair Shot', 'file': 'https://alexa-soundcloud.now.sh/stream/484966224/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'WATEVA ft. Alia - Amnesia', 'file': 'https://alexa-soundcloud.now.sh/stream/477498579/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'LUМ€CKS ft. Kat Vinter  - First Last Kiss (Calippo Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/471631746/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'CLEIN - Give It To Me', 'file': 'https://alexa-soundcloud.now.sh/stream/470257773/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Nathan Rux - Back To You', 'file': 'https://alexa-soundcloud.now.sh/stream/465039156/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jerome Price - Get Me There', 'file': 'https://alexa-soundcloud.now.sh/stream/449056317/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Kyle Meehan X Delta Jack - Needed You', 'file': 'https://alexa-soundcloud.now.sh/stream/442638714/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Halogen - Time', 'file': 'https://alexa-soundcloud.now.sh/stream/429196587/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Lovesick', 'file': 'https://alexa-soundcloud.now.sh/stream/393486222/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Ellis - Fuschia', 'file': 'https://alexa-soundcloud.now.sh/stream/386031239/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dallerium - Need U', 'file': 'https://alexa-soundcloud.now.sh/stream/382594217/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Confused (ft. joegarratt)', 'file': 'https://alexa-soundcloud.now.sh/stream/380582459/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Darkness', 'file': 'https://alexa-soundcloud.now.sh/stream/374606726/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Tru Concept x JLV x Nu Aspect - Love You No More', 'file': 'https://alexa-soundcloud.now.sh/stream/373118339/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dallerium - What I Know', 'file': 'https://alexa-soundcloud.now.sh/stream/372207767/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'RIKA ft. THE HIGHESTER - No Need (ZAIO Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/360372353/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'VANRIP & Truth x Lies - What Is Love', 'file': 'https://alexa-soundcloud.now.sh/stream/348864870/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'YNC x S3RIOUS x Fynn - Space', 'file': 'https://alexa-soundcloud.now.sh/stream/333189548/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jerome Price ft. Alex Mills - Nothing Left To Lose', 'file': 'https://alexa-soundcloud.now.sh/stream/327303491/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'ohmyboy & RГёom - Im On Overload', 'file': 'https://alexa-soundcloud.now.sh/stream/324626896/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'TRU Concept & Nu Aspect - Said To You', 'file': 'https://alexa-soundcloud.now.sh/stream/322284779/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Soaring', 'file': 'https://alexa-soundcloud.now.sh/stream/319251714/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Anto - What I Feel', 'file': 'https://alexa-soundcloud.now.sh/stream/314121245/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Nu Aspect - Things I Said', 'file': 'https://alexa-soundcloud.now.sh/stream/310544030/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Words Arent Enough', 'file': 'https://alexa-soundcloud.now.sh/stream/308857926/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jerome Price - Nobody (ft. Karen Harding)', 'file': 'https://alexa-soundcloud.now.sh/stream/308237106/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - All My Life', 'file': 'https://alexa-soundcloud.now.sh/stream/305601075/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Alone', 'file': 'https://alexa-soundcloud.now.sh/stream/302371892/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'No Hopes ft. Kinspin - Changes', 'file': 'https://alexa-soundcloud.now.sh/stream/300328918/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dave Silcox & Kvdos -  Broken Promises (ft. Little Nikki)', 'file': 'https://alexa-soundcloud.now.sh/stream/291513875/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Liv Dawson - Reflection (MI10M Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/289015841/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Alec Maire - Azuka', 'file': 'https://alexa-soundcloud.now.sh/stream/282427533/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'}
]})
});

document.getElementById('trSongs').addEventListener('click', function(e) {
    AP.destroy();
e.preventDefault();
  AP.init({
      playList:[
{'icon': iconImage, 'title': 'Armin van Buuren & MaRLo feat. Mila Josef - This I Vow', 'file': 'https://alexa-soundcloud.now.sh/stream/779059045/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & MaRLo feat. Mila Josef - This I Vow (MaRLos Tech Energy Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/779057842/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Cimo FrГ¤nkel - All Comes Down (Sneijder Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101814/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Avalan - Sucker For Love (LumГЇsade Balearic Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101694/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Avalan - Sucker For Love (No Class Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101676/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren vs Tempo Giusto - Mr. Navigator (Maxim Lany Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101646/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. HALIENE - Song I Sing (Ben Gold Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101613/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. James Newman - High On Your Love (KhoMha Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101589/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren vs Tempo Giusto - Mr. Navigator (Marco Lys Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101442/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Miles Away (Graham Bell Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101415/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & BT feat. Nation Of One - Always (BT Club Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101331/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Wild Wild Son (Deorro & Reece Low Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101292/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Stickup (Bassjackers Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775101268/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Matluck - Dont Let Me Go (DRYM Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775100998/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Million Voices (Blasterjaxx Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775100986/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren vs Tempo Giusto - Mr. Navigator (Berg & Hi Profile Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775100923/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Candace Sosa - Runaway (Elevven Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775100887/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. David Hodges - Waking Up With You (ReOrder Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775100773/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Miles Away (Artento Divini & Davey Asprey Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/775100692/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren vs Tempo Giusto - Mr. Navigator (Steve Aokis I Am The Captain Now Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/763713355/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. David Hodges - Waking Up With You (Jamis Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/760051786/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Cimo FrГ¤nkel - All Comes Down (Third Party Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/758243203/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Million Voices (Madison Mars Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/758242612/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Let The Music Guide You (ASOT 950 Anthem) (PROFF Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/758253055/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Let The Music Guide You (ASOT 950 Anthem) (WAIO Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/758252251/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Let The Music Guide You (ASOT 950 Anthem) (Beatsole Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/758252128/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Let The Music Guide You (ASOT 950 Anthem) (Tempo Giusto Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/758252116/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. HALIENE - Song I Sing (Will Sparks Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/752260786/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Matluck - Dont Let Me Go (Lucas & Steve Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/752256313/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Miles Away (Avian Grays Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/748676284/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren vs Tempo Giusto - Mr. Navigator (Sevenn Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/748675345/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Ne-Yo - Unlove You (KOLIDESCOPES Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/751670995/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Candace Sosa - Runaway (Fisherman Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/743443300/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Avian Grays feat. Jordan Shaw - Something Real (Cosmic Gate Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/743442745/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Ne-Yo - Unlove You (Myon Return To 95 Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/743441554/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren vs Tempo Giusto - Mr. Navigator (i_o Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/733833730/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Candace Sosa - Runaway (Erly Tepshi Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/733833727/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Stickup (Maarten de Jong Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/735909277/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Ne-Yo - Unlove You (Nicky Romero Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/713260411/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Let The Music Guide You (ASOT 950 Anthem)', 'file': 'https://alexa-soundcloud.now.sh/stream/705172054/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & BT feat. Nation Of One - Always', 'file': 'https://alexa-soundcloud.now.sh/stream/697792291/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Miles Away', 'file': 'https://alexa-soundcloud.now.sh/stream/695949381/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Million Voices', 'file': 'https://alexa-soundcloud.now.sh/stream/695949377/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Candace Sosa - Runaway', 'file': 'https://alexa-soundcloud.now.sh/stream/695949365/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. HALIENE - Song I Sing', 'file': 'https://alexa-soundcloud.now.sh/stream/695949289/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Cimo FrГ¤nkel - All Comes Down (Acoustic Version)', 'file': 'https://alexa-soundcloud.now.sh/stream/682458029/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Cimo FrГ¤nkel - All Comes Down', 'file': 'https://alexa-soundcloud.now.sh/stream/682457972/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'In and out of Love (Lost Frequencies 2.0 Remix) [feat. Sharon den Adel]', 'file': 'https://alexa-soundcloud.now.sh/stream/686308033/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Matluck - Dont Let Me Go', 'file': 'https://alexa-soundcloud.now.sh/stream/679617653/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. James Newman - High On Your Love', 'file': 'https://alexa-soundcloud.now.sh/stream/680025464/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'W&W x Armin van Buuren - Ready To Rave (Bass Modulators Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/666788294/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Avian Grays feat. Jordan Shaw - Something Real (Giuseppe Ottaviani Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/668924234/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Avian Grays feat. Jordan Shaw - Something Real (Sem Vox Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/668924066/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren presents Rising Star feat. Alexandra Badoi - Cosmos', 'file': 'https://alexa-soundcloud.now.sh/stream/652946204/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Turn It Up (ClГ©ment Leroux Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/636016077/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Turn It Up (Sound Rush Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/636016065/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Wild Wild Son (Devin Wild Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/633186507/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Garibay - Phone Down (Jorn van Deynhoven Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/632689587/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Garibay - Phone Down (OFFAIAH Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/632682192/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Garibay - Phone Down (Andrelli Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/632670099/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Garibay - Phone Down (BRKLYN Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/632665887/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Luke Bond feat. KARRA - Revolution', 'file': 'https://alexa-soundcloud.now.sh/stream/625388190/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Garibay - Phone Down (Club Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/600761976/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren & Garibay - Phone Down', 'file': 'https://alexa-soundcloud.now.sh/stream/597789549/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren vs Shapov - La RГ©sistance De LAmour', 'file': 'https://alexa-soundcloud.now.sh/stream/600955551/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren x Lucas & Steve feat. Josh Cumbee - Dont Give Up On Me (Club Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/597202314/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren x Lucas & Steve feat. Josh Cumbee - Dont Give Up On Me (Trance Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/597202260/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren x Lucas & Steve feat. Josh Cumbee - Dont Give Up On Me', 'file': 'https://alexa-soundcloud.now.sh/stream/586447539/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Bonnie McKee - Lonely For You (ReOrder Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/590616852/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Lifting You Higher (ASOT 900 Anthem) (Avao Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/574151916/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Lifting You Higher (ASOT 900 Anthem) (Andrew Rayel Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/574151835/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Lifting You Higher (ASOT 900 Anthem) (Maor Levi Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/574151742/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Lifting You Higher (ASOT 900 Anthem) (Blasterjaxx Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/574151676/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Bonnie McKee - Lonely For You', 'file': 'https://alexa-soundcloud.now.sh/stream/564326430/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Wild Wild Son (Richard Durand Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/546771813/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Wild Wild Son (Fatum Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/546771507/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Be In The Moment (ASOT 850 Anthem) (Stoneface & Terminal Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/527251668/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Josh Cumbee - Sunny Days (Ryan Riback Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/526191672/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Wild Wild Son (Club Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/512325912/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Wild Wild Son', 'file': 'https://alexa-soundcloud.now.sh/stream/509725560/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Blah Blah Blah (Regi Extended Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/499793853/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Blah Blah Blah (Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/499793850/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'The Sound of Goodbye (Pedro Del Mar & Beatsole Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/475444461/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'The Sound of Goodbye (Ferrin & Morris Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/475444458/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'The Sound of Goodbye (Steve Allen Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/475444374/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'The Sound of Goodbye (Pedro Del Mar & Beatsole Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/475444329/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'The Sound of Goodbye (Ferrin & Morris Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/475444326/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren x Vini Vici x Alok feat. Zafrir - United', 'file': 'https://alexa-soundcloud.now.sh/stream/479599788/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Blah Blah Blah (Zany Extended Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/476043867/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Blah Blah Blah (Brennan Heart & Toneshifterz Extended Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/476043762/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Blah Blah Blah (Bassjackers Extended Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/476043729/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Blah Blah Blah (Alyx Ander Extended Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/476043678/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Armin van Buuren - Blah Blah Blah (TRU Concept Extended Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/476043657/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'}
]})
});

document.getElementById('rrSongs').addEventListener('click', function(e) {
    AP.destroy();
e.preventDefault();
  AP.init({
      playList:[
         {'icon': iconImage, 'title': 'Aleksey Alekseev - Electro Swing', 'file': 'http://promodj.com/download/6979645/Aleksey%20Alekseev%20-%20Electro%20Swing%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'DJ Pavel M - Party People (Radio Edit)', 'file': 'http://promodj.com/download/6980612/DJ%20Pavel%20M%20-%20Party%20People%20%28Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Виктор Перевал - Новый русский хит', 'file': 'http://promodj.com/download/6978349/%D0%92%D0%B8%D0%BA%D1%82%D0%BE%D1%80%20%D0%9F%D0%B5%D1%80%D0%B5%D0%B2%D0%B0%D0%BB%20-%20%D0%9D%D0%BE%D0%B2%D1%8B%D0%B9%20%D1%80%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9%20%D1%85%D0%B8%D1%82%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Q o d ë s - Lie', 'file': 'http://promodj.com/download/6941391/Q%20o%20d%20%C3%AB%20s%20-%20Lie%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Dua Lipa - New Rules (Shreds Owl Remix)', 'file': 'http://promodj.com/download/6941446/Dua%20Lipa%20-%20New%20Rules%20%28Shreds%20Owl%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Мэвл - Безумно (DJ Fazzer Radio Remix)', 'file': 'http://promodj.com/download/6978657/%D0%9C%D1%8D%D0%B2%D0%BB%20-%20%D0%91%D0%B5%D0%B7%D1%83%D0%BC%D0%BD%D0%BE%20%28DJ%20Fazzer%20Radio%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Лоя Feat Dj Sacura x Droz & Lapin - Я Буду ( Dj Amada Mash Up )', 'file': 'http://promodj.com/download/6979540/%D0%9B%D0%BE%D1%8F%20Feat%20Dj%20Sacura%20x%20Droz%20%26%20Lapin%20-%20%D0%AF%20%D0%91%D1%83%D0%B4%D1%83%20%28%20Dj%20Amada%20Mash%20Up%20%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Артур Пирожков - Чика (Lapin & Dzoz Radio Edit)', 'file': 'http://promodj.com/download/6979006/%D0%90%D1%80%D1%82%D1%83%D1%80%20%D0%9F%D0%B8%D1%80%D0%BE%D0%B6%D0%BA%D0%BE%D0%B2%20-%20%D0%A7%D0%B8%D0%BA%D0%B0%20%28Lapin%20%26%20Dzoz%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Niletto - Я останусь простым (Alex Shik Radio Edit)', 'file': 'http://promodj.com/download/6979978/Niletto%20-%20%D0%AF%20%D0%BE%D1%81%D1%82%D0%B0%D0%BD%D1%83%D1%81%D1%8C%20%D0%BF%D1%80%D0%BE%D1%81%D1%82%D1%8B%D0%BC%20%28Alex%20Shik%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Zivert feat. MDee - Двусмысленно (Oneon Remix) wav remastering', 'file': 'http://promodj.com/download/6947093/Zivert%20feat.%20M%27Dee%20-%20%D0%94%D0%B2%D1%83%D1%81%D0%BC%D1%8B%D1%81%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%20%28Oneon%20Remix%29%20wav%20remastering%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Mahmut Orhan & Irina Rimes - Schhh. (I Feel Your Pain) (Festum Rmx)(VovanSeverny Mix)', 'file': 'http://promodj.com/download/6980934/Mahmut%20Orhan%20%26%20Irina%20Rimes%20-%20Schhh.%20%28I%20Feel%20Your%20Pain%29%20%28Festum%20Rmx%29%28VovanSeverny%20Mix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Chok - I have To Say # 1 (ELECTRO BAMM Remix)', 'file': 'http://promodj.com/download/6979282/Chok%20-%20I%20have%20To%20Say%20%23%201%20%28ELECTRO%20BAMM%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Dr. Alban vs. The Jungle Brothers - Jungle Brothers (CJ Plus & Martik C remix)', 'file': 'http://promodj.com/download/6949053/Dr.%20Alban%20vs.%20The%20Jungle%20Brother%27s%20-%20Jungle%20Brothers%20%28CJ%20Plus%20%26%20Martik%20C%20remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'DJ Snake, Eptic, Ship Wrek, Benny Benassi - SouthSide Satisfaction (Deejay Deeper Bootleg)', 'file': 'http://promodj.com/download/6979924/DJ%20Snake%2C%20Eptic%2C%20Ship%20Wrek%2C%20Benny%20Benassi%20-%20SouthSide%20Satisfaction%20%28Deejay%20Deeper%20Bootleg%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Miyagi - Marlboro (Assata Remix)', 'file': 'http://promodj.com/download/6980523/Miyagi%20-%20Marlboro%20%28Assata%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Mariah Carey feat. Jermaine Dupri, Fatman Scoop vs Bingo Players - Its Like Rattle (DJ JOHN LIGHT EDIT)[2020]', 'file': 'http://promodj.com/download/6980457/Mariah%20Carey%20feat.%20Jermaine%20Dupri%2C%20Fatman%20Scoop%20vs%20Bingo%20Players%20-%20It%27s%20Like%20Rattle%20%28DJ%20JOHN%20LIGHT%20EDIT%29%5B2020%5D%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Artik & Asti - Невероятно (Kolya Dark & Leo Burn Radio Edit)', 'file': 'http://promodj.com/download/6981018/Artik%20%26%20Asti%20-%20%D0%9D%D0%B5%D0%B2%D0%B5%D1%80%D0%BE%D1%8F%D1%82%D0%BD%D0%BE%20%28Kolya%20Dark%20%26%20Leo%20Burn%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Chok - I Have To Say (Denis Ganiev Remix)', 'file': 'http://promodj.com/download/6954981/Chok%20-%20I%20Have%20To%20Say%20%28Denis%20Ganiev%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Artik & Asti Ft. Ramirez & Steff Da Campo X Siks - Девочка Танцуй (Gokhan Yavuz Mashup)', 'file': 'http://promodj.com/download/6978494/Artik%20%26%20Asti%20Ft.%20Ramirez%20%26%20Steff%20Da%20Campo%20X%20Siks%20-%20%D0%94%D0%B5%D0%B2%D0%BE%D1%87%D0%BA%D0%B0%20%D0%A2%D0%B0%D0%BD%D1%86%D1%83%D0%B9%20%28Gokhan%20Yavuz%20Mashup%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Zivert - Шарик (Territory of Sound remix)', 'file': 'http://promodj.com/download/6980859/Zivert%20-%20%D0%A8%D0%B0%D1%80%D0%B8%D0%BA%20%28Territory%20of%20Sound%20remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Rompasso - Ignis (Rakurs Radio Edit)', 'file': 'http://promodj.com/download/6981020/Rompasso%20-%20Ignis%20%28Rakurs%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Chok - I  Have To Say (Bow Remix)', 'file': 'http://promodj.com/download/6979303/Chok%20-%20I%20%20Have%20To%20Say%20%28Bow%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'GunOut - Ride', 'file': 'http://promodj.com/download/6980248/GunOut%20-%20Ride%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'VICTORIA ANGEL - Зачем быть лучше?! (DJ CRAZY PUMP Remix)', 'file': 'http://promodj.com/download/6952307/VICTORIA%20ANGEL%20-%20%D0%97%D0%B0%D1%87%D0%B5%D0%BC%20%D0%B1%D1%8B%D1%82%D1%8C%20%D0%BB%D1%83%D1%87%D1%88%D0%B5%3F%21%20%28DJ%20CRAZY%20PUMP%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Dua Lipa - Physical (DJ MKROOVE Remix)', 'file': 'http://promodj.com/download/6979167/Dua%20Lipa%20-%20Physical%20%28DJ%20MKROOVE%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Danny Shark - Cordial (AL Remix)', 'file': 'http://promodj.com/download/6980698/Danny%20Shark%20-%20Cordial%20%28AL%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Limetra - Adele', 'file': 'http://promodj.com/download/6978631/Limetra%20-%20Adele%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Sam Smith - Fire On Fire (Alex Marwell Remix)', 'file': 'http://promodj.com/download/6981140/Sam%20Smith%20-%20Fire%20On%20Fire%20%28Alex%20Marwell%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Masterboy - Give Me Your Love (Yura West Remix 2k20)', 'file': 'http://promodj.com/download/6943031/Masterboy%20-%20Give%20Me%20Your%20Love%20%28Yura%20West%20Remix%202k20%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Тима Белорусских - Мокрые кроссы (Lapin & Dzoz Radio Edit)', 'file': 'http://promodj.com/download/6980632/%D0%A2%D0%B8%D0%BC%D0%B0%20%D0%91%D0%B5%D0%BB%D0%BE%D1%80%D1%83%D1%81%D1%81%D0%BA%D0%B8%D1%85%20-%20%D0%9C%D0%BE%D0%BA%D1%80%D1%8B%D0%B5%20%D0%BA%D1%80%D0%BE%D1%81%D1%81%D1%8B%20%28Lapin%20%26%20Dzoz%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'DJ Silver Nail - Я и Ты  (Radio mix)', 'file': 'http://promodj.com/download/6980424/DJ%20Silver%20Nail%20-%20%D0%AF%20%D0%B8%20%D0%A2%D1%8B%20%20%28Radio%20mix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Tyga - Ayy Macarena (ilkan Gunuc & Buraqram Remix)', 'file': 'http://promodj.com/download/6979620/Tyga%20-%20Ayy%20Macarena%20%28ilkan%20Gunuc%20%26%20Buraqram%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'LOBODA - Новый Рим (Vincent & Diaz Remix)', 'file': 'http://promodj.com/download/6945061/LOBODA%20-%20%D0%9D%D0%BE%D0%B2%D1%8B%D0%B8%CC%86%20%D0%A0%D0%B8%D0%BC%20%28Vincent%20%26%20Diaz%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Слава Васильев - Так вот какая ты', 'file': 'http://promodj.com/download/6978795/%D0%A1%D0%BB%D0%B0%D0%B2%D0%B0%20%D0%92%D0%B0%D1%81%D0%B8%D0%BB%D1%8C%D0%B5%D0%B2%20-%20%D0%A2%D0%B0%D0%BA%20%D0%B2%D0%BE%D1%82%20%D0%BA%D0%B0%D0%BA%D0%B0%D1%8F%20%D1%82%D1%8B%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'creemstah - smooth', 'file': 'http://promodj.com/download/6979146/creemstah%20-%20smooth%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Скруджи, Butesha - Жесткий Секс (ENSO MASHUP 2020)', 'file': 'http://promodj.com/download/6978328/%D0%A1%D0%BA%D1%80%D1%83%D0%B4%D0%B6%D0%B8%2C%20Butesha%20-%20%D0%96%D0%B5%D1%81%D1%82%D0%BA%D0%B8%D0%B9%20%D0%A1%D0%B5%D0%BA%D1%81%20%28ENSO%20MASHUP%202020%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Monatik - Витамин D (Vadim Adamov ft Avenso radio Edit)', 'file': 'http://promodj.com/download/6978967/Monatik%20-%20%D0%92%D0%B8%D1%82%D0%B0%D0%BC%D0%B8%D0%BD%20D%20%28Vadim%20Adamov%20ft%20Avenso%20radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Trevor Daniel - Falling (Juke Remix)', 'file': 'http://promodj.com/download/6980966/Trevor%20Daniel%20-%20Falling%20%28Juke%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Клава Кока - Покинула Чат (Ruks Remix)', 'file': 'http://promodj.com/download/6980435/%D0%9A%D0%BB%D0%B0%D0%B2%D0%B0%20%D0%9A%D0%BE%D0%BA%D0%B0%20-%20%D0%9F%D0%BE%D0%BA%D0%B8%D0%BD%D1%83%D0%BB%D0%B0%20%D0%A7%D0%B0%D1%82%20%28Ruks%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Анна Филипчук – Любовь-война (Ayn D Remix)', 'file': 'http://promodj.com/download/6979463/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20%E2%80%93%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Ayn%20D%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Анна Филипчук  Любовь-война (Ilya Deleц remix)', 'file': 'http://promodj.com/download/6978177/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Ilya%20Dele%D1%86%20remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'ЭНДЖЕ & GNTLS - Спокойная ночь (Extended)', 'file': 'http://promodj.com/download/6980070/%D0%AD%D0%9D%D0%94%D0%96%D0%95%20%26%20GNTLS%20-%20%D0%A1%D0%BF%D0%BE%D0%BA%D0%BE%D0%B9%D0%BD%D0%B0%D1%8F%20%D0%BD%D0%BE%D1%87%D1%8C%20%28Extended%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Тайпан, Agunda - Луна не знает пути (Serg Shenon & Yudzhin Radio Remix)', 'file': 'http://promodj.com/download/6980565/%D0%A2%D0%B0%D0%B9%D0%BF%D0%B0%D0%BD%2C%20Agunda%20-%20%D0%9B%D1%83%D0%BD%D0%B0%20%D0%BD%D0%B5%20%D0%B7%D0%BD%D0%B0%D0%B5%D1%82%20%D0%BF%D1%83%D1%82%D0%B8%20%28Serg%20Shenon%20%26%20Yudzhin%20Radio%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Гранды - С днем рождения, братуха (MaxUng Mash)', 'file': 'http://promodj.com/download/6979749/%D0%93%D1%80%D0%B0%D0%BD%D0%B4%D1%8B%20-%20%D0%A1%20%D0%B4%D0%BD%D0%B5%D0%BC%20%D1%80%D0%BE%D0%B6%D0%B4%D0%B5%D0%BD%D0%B8%D1%8F%2C%20%D0%B1%D1%80%D0%B0%D1%82%D1%83%D1%85%D0%B0%20%28MaxUng%20Mash%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Celine Dion - My heart will go on (Dj Romantic remix)', 'file': 'http://promodj.com/download/6980926/Celine%20Dion%20-%20My%20heart%20will%20go%20on%20%28Dj%20Romantic%20remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Nastya Gerasimova - Любимый человек (MaxS & ALEXANDROV Remix) (Cover ANIVAR)', 'file': 'http://promodj.com/download/6980603/Nastya%20Gerasimova%20-%20%D0%9B%D1%8E%D0%B1%D0%B8%D0%BC%D1%8B%D0%B9%20%D1%87%D0%B5%D0%BB%D0%BE%D0%B2%D0%B5%D0%BA%20%28MaxS%20%26%20ALEXANDROV%20Remix%29%20%28Cover%20ANIVAR%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Untimed - Invisible darkness', 'file': 'http://promodj.com/download/6980958/Untimed%20-%20Invisible%20darkness%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Оксана Почепа - Кислотный Dj (Dima Cramix Remix) 2020', 'file': 'http://promodj.com/download/6952352/%D0%9E%D0%BA%D1%81%D0%B0%D0%BD%D0%B0%20%D0%9F%D0%BE%D1%87%D0%B5%D0%BF%D0%B0%20-%20%D0%9A%D0%B8%D1%81%D0%BB%D0%BE%D1%82%D0%BD%D1%8B%D0%B9%20Dj%20%28Dima%20Cramix%20Remix%29%202020%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Zivert - ЯТЛ ( Dj Mephisto & ISO Music Remix )( Radio Edit)', 'file': 'http://promodj.com/download/6978891/Zivert%20-%20%D0%AF%D0%A2%D0%9B%20%28%20Dj%20Mephisto%20%26%20ISO%20Music%20Remix%20%29%28%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Iron maiden-the number of the beast(borix remix)', 'file': 'http://promodj.com/download/6980801/Iron%20maiden-the%20number%20of%20the%20beast%28borix%20remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Mary Gu - Дисней (MaxS & ALEXANDROV Radio Edit)', 'file': 'http://promodj.com/download/6980479/Mary%20Gu%20-%20%D0%94%D0%B8%D1%81%D0%BD%D0%B5%D0%B9%20%28MaxS%20%26%20ALEXANDROV%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Petria - I Miss Your Love (DJ.Tuch Remix)', 'file': 'http://promodj.com/download/6979884/Petria%20-%20I%20Miss%20Your%20Love%20%28DJ.Tuch%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Tolika - Рискуй (Tonika Remix 2020)', 'file': 'http://promodj.com/download/6978184/Tolika%20-%20%D0%A0%D0%B8%D1%81%D0%BA%D1%83%D0%B9%20%28Tonika%20Remix%202020%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Земфира - Искала [SpaB MiX]', 'file': 'http://promodj.com/download/6980916/%D0%97%D0%B5%D0%BC%D1%84%D0%B8%D1%80%D0%B0%20-%20%D0%98%D1%81%D0%BA%D0%B0%D0%BB%D0%B0%20%5BSpaB%20MiX%5D%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'КАРАНТИННАЯ (Всё по-другому)', 'file': 'http://promodj.com/download/6978594/%D0%9A%D0%90%D0%A0%D0%90%D0%9D%D0%A2%D0%98%D0%9D%D0%9D%D0%90%D0%AF%20%28%D0%92%D1%81%D1%91%20%D0%BF%D0%BE-%D0%B4%D1%80%D1%83%D0%B3%D0%BE%D0%BC%D1%83%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Макс Барских - Лей, не жалей (ASPARAGUSproject Remix)', 'file': 'http://promodj.com/download/6952018/%D0%9C%D0%B0%D0%BA%D1%81%20%D0%91%D0%B0%D1%80%D1%81%D0%BA%D0%B8%D1%85%20-%20%D0%9B%D0%B5%D0%B9%2C%20%D0%BD%D0%B5%20%D0%B6%D0%B0%D0%BB%D0%B5%D0%B9%20%28ASPARAGUSproject%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Мохито - Smoking My Life (Dj Dmitriy Romanov & Bunny Tunes Radio Mix)', 'file': 'http://promodj.com/download/6981082/%D0%9C%D0%BE%D1%85%D0%B8%D1%82%D0%BE%20-%20Smoking%20My%20Life%20%28Dj%20Dmitriy%20Romanov%20%26%20Bunny%20Tunes%20Radio%20Mix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Васильев Слава - Одинокий мужичок', 'file': 'http://promodj.com/download/6978565/%D0%92%D0%B0%D1%81%D0%B8%D0%BB%D1%8C%D0%B5%D0%B2%20%D0%A1%D0%BB%D0%B0%D0%B2%D0%B0%20-%20%D0%9E%D0%B4%D0%B8%D0%BD%D0%BE%D0%BA%D0%B8%D0%B9%20%D0%BC%D1%83%D0%B6%D0%B8%D1%87%D0%BE%D0%BA%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'KVSH & Flakke - Me Gusta CONGA (SKINU V.I.P Bootleg)', 'file': 'http://promodj.com/download/6979649/KVSH%20%26%20Flakke%20-%20Me%20Gusta%20CONGA%20%28SKINU%20V.I.P%20Bootleg%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Анна Филипчук – Любовь-война (Dj MidNight remix)', 'file': 'http://promodj.com/download/6978651/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20%E2%80%93%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Dj%20MidNight%20remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Макс Корж - Амстердам (Iblis remix radio edit)', 'file': 'http://promodj.com/download/6979004/%D0%9C%D0%B0%D0%BA%D1%81%20%D0%9A%D0%BE%D1%80%D0%B6%20-%20%D0%90%D0%BC%D1%81%D1%82%D0%B5%D1%80%D0%B4%D0%B0%D0%BC%20%28Iblis%20remix%20radio%20edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Nebezao - Black Panther (Alex Shik Radio Edit)', 'file': 'http://promodj.com/download/6979666/Nebezao%20-%20Black%20Panther%20%28Alex%20Shik%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Loboda - Парень (Avenso remix)', 'file': 'http://promodj.com/download/6978970/Loboda%20-%20%D0%9F%D0%B0%D1%80%D0%B5%D0%BD%D1%8C%20%28Avenso%20remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'GunOut - MurderKilla', 'file': 'http://promodj.com/download/6980083/GunOut%20-%20MurderKilla%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'TONY SCHWERY - Oriental Confessions (Fekbek Remix)', 'file': 'http://promodj.com/download/6978871/TONY%20SCHWERY%20-%20Oriental%20Confessions%20%28Fekbek%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Zivert - Credo (Extraction Wave Remix)', 'file': 'http://promodj.com/download/6980671/Zivert%20-%20Credo%20%28Extraction%20Wave%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Ice MС - Think About The Way (Explo Radio Edit)', 'file': 'http://promodj.com/download/6979194/Ice%20M%D0%A1%20-%20Think%20About%20The%20Way%20%28Explo%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'REFLEX - Дым и танцы (PREGO Remix)', 'file': 'http://promodj.com/download/6979995/REFLEX%20-%20%D0%94%D1%8B%D0%BC%20%D0%B8%20%D1%82%D0%B0%D0%BD%D1%86%D1%8B%20%28PREGO%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Bad Boys Blue - Show Me The Way (ExclUsive Bootleg)`20', 'file': 'http://promodj.com/download/6962533/Bad%20Boys%20Blue%20-%20Show%20Me%20The%20Way%20%28ExclUsive%20Bootleg%29%6020%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Chok - I Have To Say (Veyya Remix V2)', 'file': 'http://promodj.com/download/6978997/Chok%20-%20I%20Have%20To%20Say%20%28Veyya%20Remix%20V2%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'MBNN - ALONE (AVENSO REMIX)', 'file': 'http://promodj.com/download/6978968/MBNN%20-%20ALONE%20%28AVENSO%20REMIX%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Aqua - Barbie Girl (Dj Psixometr Remix)', 'file': 'http://promodj.com/download/6980579/Aqua%20-%20Barbie%20Girl%20%28Dj%20Psixometr%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Вуаль - Всё не просто', 'file': 'http://promodj.com/download/6980651/%D0%92%D1%83%D0%B0%D0%BB%D1%8C%20-%20%D0%92%D1%81%D1%91%20%D0%BD%D0%B5%20%D0%BF%D1%80%D0%BE%D1%81%D1%82%D0%BE%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Zivert & Tanir & Tyomcha - Beverly Hills x Da Da Da ( DJ LiON Mixshow )', 'file': 'http://promodj.com/download/6980498/Zivert%20%26%20Tanir%20%26%20Tyomcha%20-%20Beverly%20Hills%20x%20Da%20Da%20Da%20%28%20DJ%20LiON%20Mixshow%20%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Анна Седокова - Увлечение (Vadim Adamov ft Avenso Radio Edit)', 'file': 'http://promodj.com/download/6978945/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A1%D0%B5%D0%B4%D0%BE%D0%BA%D0%BE%D0%B2%D0%B0%20-%20%D0%A3%D0%B2%D0%BB%D0%B5%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%28Vadim%20Adamov%20ft%20Avenso%20Radio%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Галаксея - не проси (feat.Alisher)', 'file': 'http://promodj.com/download/6979038/%D0%93%D0%B0%D0%BB%D0%B0%D0%BA%D1%81%D0%B5%D1%8F%20-%20%D0%BD%D0%B5%20%D0%BF%D1%80%D0%BE%D1%81%D0%B8%20%28feat.Alisher%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Drake - Passionfruit (DJ Kirillich ft. Avenso Remix)', 'file': 'http://promodj.com/download/6978920/Drake%20-%20Passionfruit%20%28DJ%20Kirillich%20ft.%20Avenso%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'ENICE-Party Dont Stop (Original mix)', 'file': 'http://promodj.com/download/6979589/ENICE-Party%20Dont%20Stop%20%28Original%20mix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'MORGENSHTERN & Витя АК - Ратататата (Alexx Slam Unreleased Remix)', 'file': 'http://promodj.com/download/6961904/MORGENSHTERN%20%26%20%D0%92%D0%B8%D1%82%D1%8F%20%D0%90%D0%9A%20-%20%D0%A0%D0%B0%D1%82%D0%B0%D1%82%D0%B0%D1%82%D0%B0%D1%82%D0%B0%20%28Alexx%20Slam%20Unreleased%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Анна Филипчук – Любовь-война (DJ NEXT Remix)', 'file': 'http://promodj.com/download/6980702/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20%E2%80%93%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28DJ%20NEXT%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Слава Васильев - Так вот какая ты', 'file': 'http://promodj.com/download/6978332/%D0%A1%D0%BB%D0%B0%D0%B2%D0%B0%20%D0%92%D0%B0%D1%81%D0%B8%D0%BB%D1%8C%D0%B5%D0%B2%20-%20%D0%A2%D0%B0%D0%BA%20%D0%B2%D0%BE%D1%82%20%D0%BA%D0%B0%D0%BA%D0%B0%D1%8F%20%D1%82%D1%8B%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Zivert - Двусмысленно (Rodnik & Ryzhoff Radio Edit).', 'file': 'http://promodj.com/download/6980185/Zivert%20-%20%D0%94%D0%B2%D1%83%D1%81%D0%BC%D1%8B%D1%81%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%20%28Rodnik%20%26%20Ryzhoff%20Radio%20Edit%29.%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Paul Infrasonic & BARINOVA - Do it (AparteDj Edit)', 'file': 'http://promodj.com/download/6979023/Paul%20Infrasonic%20%26%20BARINOVA%20-%20Do%20it%20%28AparteDj%20Edit%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Grivina - Я хочу (DJ Alex Ezhov remix)', 'file': 'http://promodj.com/download/6980438/Grivina%20-%20%D0%AF%20%D1%85%D0%BE%D1%87%D1%83%20%28DJ%20Alex%20Ezhov%20remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Raw Fish - Damn (Mixon Spencer & Dj Butesha Remix)', 'file': 'http://promodj.com/download/6973108/Raw%20Fish%20-%20Damn%20%28Mixon%20Spencer%20%26%20Dj%20Butesha%20Remix%29%20%28promodj.com%29.mp3'},
{'icon': iconImage, 'title': 'Мэвл - Попытка номер 5 (Eddie G & Serg Shenon Remix)', 'file': 'http://promodj.com/download/6978848/%D0%9C%D1%8D%D0%B2%D0%BB%20-%20%D0%9F%D0%BE%D0%BF%D1%8B%D1%82%D0%BA%D0%B0%20%D0%BD%D0%BE%D0%BC%D0%B5%D1%80%205%20%28Eddie%20G%20%26%20Serg%20Shenon%20Remix%29%20%28promodj.com%29.mp3'}
          ]})
});

document.getElementById('rsSongs').addEventListener('click', function(e) {
    AP.destroy();
e.preventDefault();
  AP.init({
      playList:[
          {'icon': iconImage, 'title': '‎Get Glazed - With Gil Glaze', 'file': 'http://audio.thisisdistorted.com/repository/audio/episodes/Get_Glazed_093-1585338686179350251-MzAxMTYtODk0MzUwMzM=.mp3'},
{'icon': iconImage, 'title': '‎Trance Evolution Podcast', 'file': 'http://feedproxy.google.com/~r/DjAndreaMazzaPodcast/~5/nYfcz2w9LPQ/episode625.mp3'},
{'icon': iconImage, 'title': '‎Aly &amp; Fila pres. Future Sound Of Egypt Radio', 'file': 'http://dts.podtrac.com/redirect.mp3/feeds.soundcloud.com/stream/788705119-alyandfila-future-sound-of-egypt-643-with.mp3'},
{'icon': iconImage, 'title': '‎All In Radio with Fatum', 'file': 'http://traffic.libsyn.com/fatum/007_All_In_Radio_with_Fatum.mp3?dest-id=211503'},
{'icon': iconImage, 'title': '‎JES | Unleash The Beat', 'file': 'http://media.blubrry.com/unleashthebeat/unleashthebeat.com/wp-content/uploads/2020/04/01-Unleash-The-Beat-Mixshow-386.m4a'},
{'icon': iconImage, 'title': '‎Find Your Harmony Radioshow', 'file': 'https://mcdn.podbean.com/mf/web/qvheze/Andrew_Rayel_-_Find_Your_Harmony_Radio_199_iTunes_Kolonie_Guestmix.mp3'},
{'icon': iconImage, 'title': '‎David Guetta', 'file': 'https://episodes.castos.com/davidguetta/dgplaylist503-03-04-20.aac'},
{'icon': iconImage, 'title': '‎The Martin Garrix Show', 'file': 'http://dts.podtrac.com/redirect.mp3/districtpodcast.s3.amazonaws.com/291/MGS291.mp3'},
{'icon': iconImage, 'title': '‎CLUBLIFE', 'file': 'https://feeds.acast.com/public/streams/593eded1acfa040562f3480b/episodes/5e7e0561bf0d823b35216b57.m4a'},
{'icon': iconImage, 'title': '‎R3HAB – I NEED R3HAB', 'file': 'https://cdn.simplecast.com/audio/4243b3/4243b339-d947-4b0d-9e58-31999d1c5022/11e341fe-20f6-43d7-a2c3-d8d77545e91c/i-need-r3hab-392-worldwide_tc.mp3?aid=rss_feed'}
          ]})
});
