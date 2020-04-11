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
{'icon': iconImage, 'title': 'Lincoln Jesser - Slippin', 'file': 'https://alexa-soundcloud.now.sh/stream/252568406/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000151500460-1prw9o-t500x500.jpg'},
{'icon': iconImage, 'title': 'HI-LO & Dada Life - Love Vibrations ', 'file': 'https://alexa-soundcloud.now.sh/stream/383832182/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000285411098-4qwr3l-t500x500.jpg'},
{'icon': iconImage, 'title': 'R3hab & Skytech - Everything', 'file': 'https://alexa-soundcloud.now.sh/stream/296961022/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000197529979-6bq85v-t500x500.jpg'},
{'icon': iconImage, 'title': 'Wale - The Girls On Drugs (TJR Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/219829156/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000142286366-ozpros-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chess - Ocean Palm ', 'file': 'https://alexa-soundcloud.now.sh/stream/521558484/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000430317645-8ejlsp-t500x500.jpg'},
{'icon': iconImage, 'title': 'Trixxie x Cheat Codes - All Of My Life (Tigerlily Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/654688097/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000570827780-lnmn2d-t500x500.jpg'},
{'icon': iconImage, 'title': 'D.R.A.M. - Cha Cha (Gazzo Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/228686311/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000132930570-t6usnx-t500x500.jpg'},
{'icon': iconImage, 'title': 'Rezident - Message ', 'file': 'https://alexa-soundcloud.now.sh/stream/756529015/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-knehLAsOy5DWvd1i-m2nRUw-t500x500.jpg'},
{'icon': iconImage, 'title': 'Drake - Hotline Bling (Soku Cover)', 'file': 'https://alexa-soundcloud.now.sh/stream/239314784/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000141528677-3t6mi2-t500x500.jpg'},
{'icon': iconImage, 'title': 'LS2 Ft. Sarah Newton - Seeing You (TRU Concept Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/164847591/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000171733727-6iqs4u-t500x500.jpg'},
{'icon': iconImage, 'title': 'LOUD ABOUT US! - Drums', 'file': 'https://alexa-soundcloud.now.sh/stream/329656757/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000230174487-ihw0a9-t500x500.jpg'},
{'icon': iconImage, 'title': 'John Dahlback feat. Erik Hassle - One Last Ride (Tommy Trash Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/32432614/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000016285641-to9chi-t500x500.jpg'},
{'icon': iconImage, 'title': 'EDX - Breathin (Extended Vocal Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/154607467/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000082522940-u2w7w8-t500x500.jpg'},
{'icon': iconImage, 'title': 'DJ Licious - We Dont Know ft. Jack Hawitt', 'file': 'https://alexa-soundcloud.now.sh/stream/784965175/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-g4rrVL6cQGqoGNrP-ASrusg-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lincoln Jesser - Slippin', 'file': 'https://alexa-soundcloud.now.sh/stream/252568406/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000151500460-1prw9o-t500x500.jpg'},
{'icon': iconImage, 'title': 'Will.I.Am ft. JLO & Mick Jagger - Go Hard (R3hab vs The Eye Remix) []', 'file': 'https://alexa-soundcloud.now.sh/stream/43332438/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000021753156-s0vnca-t500x500.jpg'},
{'icon': iconImage, 'title': 'A R I Z O N A - Oceans Away (The Hi-Yahs Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/311231665/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000211385453-qqe4f9-t500x500.jpg'},
{'icon': iconImage, 'title': 'Martin Garrix & Matisse & Sadko feat. Michel Zitron - Hold On', 'file': 'https://alexa-soundcloud.now.sh/stream/734493388/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000658868071-e59l2h-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ceasefire (feat. Hicari)', 'file': 'https://alexa-soundcloud.now.sh/stream/477451089/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000380116392-q8rhve-t500x500.jpg'},
{'icon': iconImage, 'title': 'Alex Newell - Keep It Moving (Mozambo Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/311625906/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000211818623-5peyn3-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lucas & Steve - Perfect (LUM!X Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/719649886/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000644181907-x30evn-t500x500.jpg'},
{'icon': iconImage, 'title': 'Arston & Jay Colin - Endless (Going Deeper Remix)[Heldeep 073 Cut]', 'file': 'https://alexa-soundcloud.now.sh/stream/229855281/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000133781130-r85bnm-t500x500.jpg'},
{'icon': iconImage, 'title': 'R3HAB & KSHMR - Islands', 'file': 'https://alexa-soundcloud.now.sh/stream/365911682/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000265947278-ck2ozn-t500x500.jpg'},
{'icon': iconImage, 'title': 'Kaskade (feat. Becky Jean Williams) - Empty Streets (Abel Ramos Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/17448689/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000008400618-9dve33-t500x500.jpg'},
{'icon': iconImage, 'title': 'Bellecour - Talk About ', 'file': 'https://alexa-soundcloud.now.sh/stream/337802702/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000238207739-809pnl-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gacha Bakradze - Contactless', 'file': 'https://alexa-soundcloud.now.sh/stream/464540247/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000366107154-hzep95-t500x500.jpg'},
{'icon': iconImage, 'title': 'The Knocks - Collect My Love Feat. Alex Newell (Lenno Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/220820433/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000127452902-rvud34-t500x500.jpg'},
{'icon': iconImage, 'title': 'Don Diablo - Hexagon Radio Episode 099 (DD YearMix 2016) (Preview)', 'file': 'https://alexa-soundcloud.now.sh/stream/298996060/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000200385279-nbbc3i-t500x500.jpg'},
{'icon': iconImage, 'title': 'boerd - 39 Celsius', 'file': 'https://alexa-soundcloud.now.sh/stream/719716414/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000644271433-jmm59q-t500x500.jpg'},
{'icon': iconImage, 'title': 'Major Lazer & MOTi - Boom (Jerome Price & James Hype Remix)- Mistajam Radio 1 Premier', 'file': 'https://alexa-soundcloud.now.sh/stream/243738474/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000144544801-5mnhwc-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lincoln Jesser - Time Will Tell (feat. Samuel Jacob)', 'file': 'https://alexa-soundcloud.now.sh/stream/264898452/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000163550330-rncah6-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lycoriscoris - Sur Oiseau', 'file': 'https://alexa-soundcloud.now.sh/stream/325338741/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000225101178-4bgkrt-t500x500.jpg'},
{'icon': iconImage, 'title': 'Abstract & Logic - Missing You', 'file': 'https://alexa-soundcloud.now.sh/stream/210038520/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000128693515-dsrcbo-t500x500.jpg'},
{'icon': iconImage, 'title': 'Franzisco - Whats On Your Mind? [Track Of The Week 41]', 'file': 'https://alexa-soundcloud.now.sh/stream/286973991/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000187530535-i0x93j-t500x500.jpg'},
{'icon': iconImage, 'title': 'Erkka - Museme', 'file': 'https://alexa-soundcloud.now.sh/stream/210715017/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000120499169-vpax1g-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dana Kelson - Hungover (Jay Fox Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/616940448/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000531063153-262fnx-t500x500.jpg'},
{'icon': iconImage, 'title': 'Redondo - Jack My Body', 'file': 'https://alexa-soundcloud.now.sh/stream/278936223/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000177416284-dece5z-t500x500.jpg'},
{'icon': iconImage, 'title': 'Missy Elliott - WTF (Where They From) (feat. Pharrell Williams) (Chris Lake Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/260081176/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000159118830-kydfyy-t500x500.jpg'},
{'icon': iconImage, 'title': 'Sevyn Streeter - Dont Kill The Fun (Troyboi Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/240886696/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000142261251-o6rqtz-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ella Vos - White Noise (R3hab Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/305981428/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000206113283-ysb05y-t500x500.jpg'},
{'icon': iconImage, 'title': 'DO NOT SHARE EVER - FLUX EP TEASER', 'file': 'https://alexa-soundcloud.now.sh/stream/69377407/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'ul'},
{'icon': iconImage, 'title': 'Robin Schulz - Stone (Nale Garcia Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/297691149/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'ul'},
{'icon': iconImage, 'title': 'Maff Boothroyd - Can You Hear Me Ft. Barbara Douglas (TRU Concept Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/172936202/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000171732369-3lmwm0-t500x500.jpg'},
{'icon': iconImage, 'title': 'Martin Solveig & Dragonette Hello (Club Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/8964814/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000004057274-il59z7-t500x500.jpg'},
{'icon': iconImage, 'title': 'Rudimental - Rumour Mill (eSQUIRE Deeper Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/219118311/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000126279821-i8rfmh-t500x500.jpg'},
{'icon': iconImage, 'title': 'Not Giving In (feat. John Newman & Alex Clare) (Loadstar Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/66764837/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000033863858-91l8vc-t500x500.jpg'},
{'icon': iconImage, 'title': 'Aeroplane & Purple Disco Machine feat. Aloe Blacc - Counting On Me ', 'file': 'https://alexa-soundcloud.now.sh/stream/298620508/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000199148385-500tyb-t500x500.jpg'},
{'icon': iconImage, 'title': 'Robby East & EWAVE - Bittersweet', 'file': 'https://alexa-soundcloud.now.sh/stream/656774924/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000573111923-puuds4-t500x500.jpg'},
{'icon': iconImage, 'title': 'Volac - Feel It ', 'file': 'https://alexa-soundcloud.now.sh/stream/621609552/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000536104230-utztcv-t500x500.jpg'},
{'icon': iconImage, 'title': 'Vijay & Sofia Zlatko - Le Jardin (Stefan Dabruck Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/222065572/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000128308153-2jvui6-t500x500.jpg'},
{'icon': iconImage, 'title': 'Taryn Manning - Send Me Your Love (R3hab Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/57430320/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000029047825-j0zobm-t500x500.jpg'},
{'icon': iconImage, 'title': 'Oliver Heldens feat. Ida Corr - Good Life (Blanee Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/307514338/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000207576370-cxl3qq-t500x500.jpg'},
{'icon': iconImage, 'title': 'Don Diablo Feat. Emeni - Universe', 'file': 'https://alexa-soundcloud.now.sh/stream/205125077/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000116526953-q8bztu-t500x500.jpg'},
{'icon': iconImage, 'title': 'Oliver Heldens & Lenno - This Groove (David Penn Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/625549110/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000540407922-nesklp-t500x500.jpg'},
{'icon': iconImage, 'title': 'Alex Metric & Ten Ven - What U Need', 'file': 'https://alexa-soundcloud.now.sh/stream/547292775/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000460789137-5iv0ll-t500x500.jpg'},
{'icon': iconImage, 'title': 'Martin Garrix & Dua Lipa - Scared To Be Lonely', 'file': 'https://alexa-soundcloud.now.sh/stream/304744944/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000204957846-dk6l3e-t500x500.jpg'},
{'icon': iconImage, 'title': 'Oliver Heldens X Becky Hill - Overdrive (Gecko) [Kaz James Remix]', 'file': 'https://alexa-soundcloud.now.sh/stream/158241890/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000084876817-okx4ws-t500x500.jpg'},
]})
});
document.getElementById('trSongs').addEventListener('click', function(e) {e.preventDefault();AP.destroy();AP.init({playList:[
{'icon': iconImage, 'title': 'Feel ', 'file': 'http://92.255.66.40/tmp_audio/itunes1/feel_-_rc_2020-04-07_320.mp3', 'cover': 'https://cdn.promodj.com/afs/6c4e618a688a45f6aa65ccba6020190512:resize:900x900:same:promodj:e9011b'},
{'icon': iconImage, 'title': 'ASOT 049 - (2002-05-23)', 'file': 'https://archive.org/download/Armin_van_Buuren_A_State_of_Trance_001-499/Armin_van_Buuren_A_State_of_Trance_Episode_049.mp3', 'cover': 'https://d1fuks2cnuq5t9.cloudfront.net/i/6WKc8vl3oVtDb8iePwyNaIXoIncsAa2wC2Z6dYgi.jpg'},
{'icon': iconImage, 'title': 'Kim SvaМ€rd - Xanadou (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/218743502/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000126020103-x96otd-t500x500.jpg'},
{'icon': iconImage, 'title': 'Eve Belle & Brian Laruso - Solace (Radio Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/246341390/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000146592168-t8yunu-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVA197 - Tomac - Cyclone *Out Now!*', 'file': 'https://alexa-soundcloud.now.sh/stream/353439836/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000253569722-11po2v-t500x500.jpg'},
{'icon': iconImage, 'title': 'Overwrite', 'file': 'https://alexa-soundcloud.now.sh/stream/194982273/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-gjia6ijJQgV6-0-t500x500.png'},
{'icon': iconImage, 'title': 'Eco & Driftmoon - Trust In The Wind (Cold Blue Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/336835982/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000237261684-g43hw0-t500x500.jpg'},
{'icon': iconImage, 'title': 'Sunrazers - Feelings', 'file': 'https://alexa-soundcloud.now.sh/stream/463367304/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000365062254-ulimzx-t500x500.jpg'},
{'icon': iconImage, 'title': 'Alex Di Stefano - Binary404 (Original Mix) - Preview -', 'file': 'https://alexa-soundcloud.now.sh/stream/18666528/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000035548557-yctuw3-t500x500.jpg'},
{'icon': iconImage, 'title': 'Greg Downey - King Dong', 'file': 'https://alexa-soundcloud.now.sh/stream/179607382/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000098964717-m7od6a-t500x500.jpg'},
{'icon': iconImage, 'title': 'Every Little Thing - For The Moment (Ferry Corsten Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/222150151/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000128365554-l9h80h-t500x500.jpg'},
{'icon': iconImage, 'title': 'BLVCKPRINT - Memories ', 'file': 'https://alexa-soundcloud.now.sh/stream/260813230/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000159803031-az7bv9-t500x500.jpg'},
{'icon': iconImage, 'title': '05_Keep On Holding feat Jan Burton (Extended)', 'file': 'https://alexa-soundcloud.now.sh/stream/747880939/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000672581947-14upv4-t500x500.jpg'},
{'icon': iconImage, 'title': '**GRAMMY NOMINATED**JE', 'file': 'https://alexa-soundcloud.now.sh/stream/206777501/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000139177211-iyijdr-t500x500.jpg'},
{'icon': iconImage, 'title': 'KhГҐen - Last Witness', 'file': 'https://alexa-soundcloud.now.sh/stream/779017594/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-3ztYzOvzztYsGy4W-XP18ig-t500x500.jpg'},
{'icon': iconImage, 'title': 'Storm - Divine Moment Of Truth ( Original Mix )', 'file': 'https://alexa-soundcloud.now.sh/stream/438186321/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000343165911-mh3jof-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVAW083 - DARVO & Claire Willis - Lift Me Up *Out Now!*', 'file': 'https://alexa-soundcloud.now.sh/stream/487933545/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000391576518-j8ur7i-t500x500.jpg'},
{'icon': iconImage, 'title': 'Advancing Man (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/153116229/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-vLnueJXlmB7s-0-t500x500.png'},
{'icon': iconImage, 'title': 'Paul Thomas & White-Akre - Goliath [FSOE UV]', 'file': 'https://alexa-soundcloud.now.sh/stream/337514556/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000237957177-7wh0jq-t500x500.jpg'},
{'icon': iconImage, 'title': '[!] Andy Elliass - Rose (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/580920159/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000494393826-y6ciw7-t500x500.jpg'},
{'icon': iconImage, 'title': 'Max Solar & Next Beat - Iren', 'file': 'https://alexa-soundcloud.now.sh/stream/67909001/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000034440927-vk7prx-t500x500.jpg'},
{'icon': iconImage, 'title': 'VIBE - Powered by Armada Music [Mini Mix] [!]', 'file': 'https://alexa-soundcloud.now.sh/stream/131633250/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000069131078-foi3et-t500x500.jpg'},
{'icon': iconImage, 'title': 'Suncatcher & Mhammed El Alami - Lily [FSOE Fables]', 'file': 'https://alexa-soundcloud.now.sh/stream/470162736/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000372283740-hx2302-t500x500.jpg'},
{'icon': iconImage, 'title': 'Anahera (Transmix by Jorn van Deynhoven) [TMR 031] [feat. Gouryella]', 'file': 'https://alexa-soundcloud.now.sh/stream/330357370/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-jzMiUvYGCq7J-0-t500x500.png'},
{'icon': iconImage, 'title': 'Armin van Buuren presents Gimmick - Free (Original)', 'file': 'https://alexa-soundcloud.now.sh/stream/294710287/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-wvG2S1tt12on-0-t500x500.png'},
{'icon': iconImage, 'title': 'No Captain feat. POLIГ‡A (ATTLAS Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/509441352/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000414905007-sq98h4-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chronosapien - El Comandante [Pulsar Recordings]', 'file': 'https://alexa-soundcloud.now.sh/stream/330317020/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000230787141-zv3dn3-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chicane - Fibreglasses [FUTURE CLASSIC]', 'file': 'https://alexa-soundcloud.now.sh/stream/191096273/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000106693494-e1sfsq-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Nadia Ali - Who Is Watching (Oliver Moldan Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/289290563/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-pmpVypw9UD33-0-t500x500.png'},
{'icon': iconImage, 'title': 'Aly & Fila - Rebirth (Pablo Artigas Remix) [FSOE Parallels]', 'file': 'https://alexa-soundcloud.now.sh/stream/553007892/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000466193385-7bolg4-t500x500.jpg'},
{'icon': iconImage, 'title': 'ARS - Wonderwork (LTN Remix) @ Richard Durands ISOS #097', 'file': 'https://alexa-soundcloud.now.sh/stream/55525372/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000028061426-5fy6rm-t500x500.jpg'},
{'icon': iconImage, 'title': 'Pulp Victim - Dreams Last For Long (Even After Youre Gone - Extended)', 'file': 'https://alexa-soundcloud.now.sh/stream/228171751/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000132557077-hlildp-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVAW044 - Diago - Zakynthos  *Out Now!*', 'file': 'https://alexa-soundcloud.now.sh/stream/353438720/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000253568669-vvyj22-t500x500.jpg'},
{'icon': iconImage, 'title': 'Running Out Of Time (Digital Edit) [feat. Chris Jones]', 'file': 'https://alexa-soundcloud.now.sh/stream/293114591/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-e6FDcu6hAQNw-0-t500x500.jpg'},
{'icon': iconImage, 'title': 'Aly & Fila feat. Sue McLaren - Mysteries Unfold (MaRLo Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/142012531/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000074952193-lojjhu-t500x500.jpg'},
{'icon': iconImage, 'title': 'Hamza Khammessi - Maximal (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/226105698/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000131082577-g6vwhb-t500x500.jpg'},
{'icon': iconImage, 'title': 'Factor B - Endless', 'file': 'https://alexa-soundcloud.now.sh/stream/296304324/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000196931122-3uz2ff-t500x500.jpg'},
{'icon': iconImage, 'title': 'Domi - Suncatchers (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/214514835/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000123103414-a6rm0y-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Josh Cumbee - Sunny Days (Tritonal Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/340129424/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-FpO3QWjzzyY9-0-t500x500.png'},
{'icon': iconImage, 'title': 'Roger Shah & DJ Feel Feat Zara Taylor - One Life (Kir Tender Remix) [ASOT759]', 'file': 'https://alexa-soundcloud.now.sh/stream/259819196/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000158865404-1g08z2-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren - Blah Blah Blah (Brennan Heart & Toneshifterz Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/466696380/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-cLcdVInr5Tyw-0-t500x500.png'},
{'icon': iconImage, 'title': 'Florian Picasso - Final Call ', 'file': 'https://alexa-soundcloud.now.sh/stream/275436686/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000173378209-vo89dp-t500x500.jpg'},
{'icon': iconImage, 'title': 'Liam Wilson & Corin Bayley - Falling Apart [FSOE Clandestine]', 'file': 'https://alexa-soundcloud.now.sh/stream/638954601/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000554427135-f0jmnp-t500x500.jpg'},
{'icon': iconImage, 'title': 'Axwell О› Ingrosso - Dreamer (ALPHA 9 Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/392246061/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000295901637-zhq37y-t500x500.jpg'},
{'icon': iconImage, 'title': 'Phaze - Awake', 'file': 'https://alexa-soundcloud.now.sh/stream/232931223/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000136049639-lni1t9-t500x500.jpg'},
{'icon': iconImage, 'title': 'Aly & Fila with Stoneface & Terminal - Universelab (Taken from The Other Shore) ', 'file': 'https://alexa-soundcloud.now.sh/stream/168442379/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000091502962-qeojt0-t500x500.jpg'},
{'icon': iconImage, 'title': 'Aureolo (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/255868116/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-CHASMcX9UA07-0-t500x500.png'},
{'icon': iconImage, 'title': 'Alexander de Roy feat. Macy - Never Be Alone (Nueva Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/309066242/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000209105906-omszww-t500x500.jpg'},
{'icon': iconImage, 'title': 'Mohamed Ragab & Mino Safy - Meronym *!*', 'file': 'https://alexa-soundcloud.now.sh/stream/209080560/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000119382531-lp5g1e-t500x500.jpg'},
{'icon': iconImage, 'title': 'T2 - The Emerald Dream [FSOE Parallels]', 'file': 'https://alexa-soundcloud.now.sh/stream/655748411/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000571931957-hskp4u-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jordi Roure - Irinas Love', 'file': 'https://alexa-soundcloud.now.sh/stream/187972902/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000104642727-t9crli-t500x500.jpg'},
{'icon': iconImage, 'title': 'Kir Tender - Theatre In Paradise (Mobil Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/272346426/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000170248071-3fluyv-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gabriel & Dresden feat. Jan Burton - Keep On Holding (ilan Bluestone & Maor Levi Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/726194152/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000650582659-s2i4yo-t500x500.jpg'},
{'icon': iconImage, 'title': 'Stereo Underground feat. Sealine - Shape Of Time [UV]', 'file': 'https://alexa-soundcloud.now.sh/stream/737852098/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000662085817-bga6ya-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren - Sail (Sudhaus Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/283997970/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-A00Ofhdf1hRZ-0-t500x500.png'},
{'icon': iconImage, 'title': 'First Sun (Digital Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/293114553/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-IbYJXcC3EJOn-0-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVA215 - Ahmet Atasever - Smashed Avo *Out Now!*', 'file': 'https://alexa-soundcloud.now.sh/stream/422652183/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000327772689-vwgq82-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVA282 - Rub!k - Akula *Out Now*', 'file': 'https://alexa-soundcloud.now.sh/stream/666856910/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000583519709-gijik8-t500x500.jpg'},
{'icon': iconImage, 'title': 'Next Stop Muddy Waters', 'file': 'https://alexa-soundcloud.now.sh/stream/396629331/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-cNs7nD6AM4aq-0-t500x500.png'},
]})
});
document.getElementById('rrSongs').addEventListener('click', function(e) {e.preventDefault();AP.destroy();AP.init({playList:[
{'icon': iconImage, 'title': 'NK - Elefante (Black Toriouz Radio Edit)', 'file': 'http://promodj.com/download/6980881/NK%20-%20Elefante%20%28Black%20Toriouz%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Zivert - ЯТЛ (Kolya Dark & DJ Prezzplay Remix)', 'file': 'http://promodj.com/download/6982002/Zivert%20-%20%D0%AF%D0%A2%D0%9B%20%28Kolya%20Dark%20%26%20DJ%20Prezzplay%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Eminem - The Real Slim Shady (DJ Vasily Pichugin Radio Remix)', 'file': 'http://promodj.com/download/6874408/Eminem%20-%20The%20Real%20Slim%20Shady%20%28DJ%20Vasily%20Pichugin%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'КОФЕ, СИГАРЕТЫ, КОНЬЯЧОК - Евгений Курский & Милалита', 'file': 'http://promodj.com/download/6968811/%D0%9A%D0%9E%D0%A4%D0%95%2C%20%D0%A1%D0%98%D0%93%D0%90%D0%A0%D0%95%D0%A2%D0%AB%2C%20%D0%9A%D0%9E%D0%9D%D0%AC%D0%AF%D0%A7%D0%9E%D0%9A%20-%20%D0%95%D0%B2%D0%B3%D0%B5%D0%BD%D0%B8%D0%B9%20%D0%9A%D1%83%D1%80%D1%81%D0%BA%D0%B8%D0%B9%20%26%20%D0%9C%D0%B8%D0%BB%D0%B0%D0%BB%D0%B8%D1%82%D0%B0%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Navai - Эгоист (Assata Remix)', 'file': 'http://promodj.com/download/6969441/Navai%20-%20%D0%AD%D0%B3%D0%BE%D0%B8%D1%81%D1%82%20%28Assata%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Qwillance - Second World', 'file': 'http://promodj.com/download/6985223/Qwillance%20-%20Second%20World%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Aksarus - Слёзы', 'file': 'http://promodj.com/download/6981484/Aksarus%20-%20%D0%A1%D0%BB%D1%91%D0%B7%D1%8B%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Never let me go(Original Mix)', 'file': 'http://promodj.com/download/6981373/Never%20let%20me%20go%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Серега & Elis Brooklyn & Hubba  & Jony Pavlov - Черный Бумер (Artem Zablocki MashUp)', 'file': 'http://promodj.com/download/6971095/%D0%A1%D0%B5%D1%80%D0%B5%D0%B3%D0%B0%20%26%20Elis%20Brooklyn%20%26%20Hubba%20%20%26%20Jony%20Pavlov%20-%20%D0%A7%D0%B5%D1%80%D0%BD%D1%8B%D0%B9%20%D0%91%D1%83%D0%BC%D0%B5%D1%80%20%28Artem%20Zablocki%20MashUp%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'DJ Andry IG - Dance Love (Original Mix)', 'file': 'http://promodj.com/download/6973498/DJ%20Andry%20IG%20-%20Dance%20Love%20%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jax Jones - You Dont Know Me(Avenso ft. Vadim Adamov remix)', 'file': 'http://promodj.com/download/6978923/Jax%20Jones%20-%20You%20Don%27t%20Know%20Me%28Avenso%20ft.%20Vadim%20Adamov%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Faithless - Insomnia (ALEX-NE1 REMIX-2019)', 'file': 'http://promodj.com/download/6982915/Faithless%20-%20Insomnia%20%28ALEX-NE1%20REMIX-2019%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Руки Вверх - Укради меня (DJ Prezzplay & Kolya Dark Remix)', 'file': 'http://promodj.com/download/6971574/%D0%A0%D1%83%D0%BA%D0%B8%20%D0%92%D0%B2%D0%B5%D1%80%D1%85%20-%20%D0%A3%D0%BA%D1%80%D0%B0%D0%B4%D0%B8%20%D0%BC%D0%B5%D0%BD%D1%8F%20%28DJ%20Prezzplay%20%26%20Kolya%20Dark%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Deep Bros - Vamos', 'file': 'http://promodj.com/download/6967962/Deep%20Bros%20-%20Vamos%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Troyboi - Do You (DJ MaxUng Remix)', 'file': 'http://promodj.com/download/6973624/Troyboi%20-%20Do%20You%20%28DJ%20MaxUng%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Елена Темникова - Моё Любимое (Housemad Remix)', 'file': 'http://promodj.com/download/6971275/%D0%95%D0%BB%D0%B5%D0%BD%D0%B0%20%D0%A2%D0%B5%D0%BC%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2%D0%B0%20-%20%D0%9C%D0%BE%D1%91%20%D0%9B%D1%8E%D0%B1%D0%B8%D0%BC%D0%BE%D0%B5%20%28Housemad%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Maroon 5 feat. Christina Aguilera - Moves Like Jagger (Jenia Smile & Ser Twister Remix)', 'file': 'http://promodj.com/download/6976824/Maroon%205%20feat.%20Christina%20Aguilera%20-%20Moves%20Like%20Jagger%20%28Jenia%20Smile%20%26%20Ser%20Twister%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Trevor Daniel x Eddie G & Misha Maklay & Jurbas - Falling (SAlANDIR Radio Version)', 'file': 'http://promodj.com/download/6976813/Trevor%20Daniel%20x%20Eddie%20G%20%26%20Misha%20Maklay%20%26%20Jurbas%20-%20Falling%20%28SAlANDIR%20Radio%20Version%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'дижит', 'file': 'http://promodj.com/download/6971732/%D0%B4%D0%B8%D0%B6%D0%B8%D1%82%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': '50 Cent - Candy Shop (DJ SASH AKA FROST Remix)', 'file': 'http://promodj.com/download/6825930/50%20Cent%20-%20Candy%20Shop%20%28DJ%20SASH%20AKA%20FROST%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jennie x Sesa - Like Solo 2019 (Akhmetoff Mashup)', 'file': 'http://promodj.com/download/6982626/Jennie%20x%20Sesa%20-%20Like%20Solo%202019%20%28Akhmetoff%20Mashup%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Captain Hollywood Project - More and  More (Dj Ramezz Vocal Mix) 2020', 'file': 'http://promodj.com/download/6910019/Captain%20Hollywood%20Project%20-%20More%20and%20%20More%20%28Dj%20Ramezz%20Vocal%20Mix%29%202020%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'DJ Cruz - Fendi F (No Hopes Radio Mix)', 'file': 'http://promodj.com/download/6813423/DJ%20Cruz%20-%20Fendi%20F%20%28No%20Hopes%20Radio%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Земфира - Искала [SpaB MiX]', 'file': 'http://promodj.com/download/6980916/%D0%97%D0%B5%D0%BC%D1%84%D0%B8%D1%80%D0%B0%20-%20%D0%98%D1%81%D0%BA%D0%B0%D0%BB%D0%B0%20%5BSpaB%20MiX%5D%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Sofi Tukker – Batshit (Denis First & Reznikov Remix) [Extended Mix]', 'file': 'http://promodj.com/download/6809850/Sofi%20Tukker%20%E2%80%93%20Batshit%20%28Denis%20First%20%26%20Reznikov%20Remix%29%20%5BExtended%20Mix%5D%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Анна Филипчук - Любовь-война (CJ Prinze remix)', 'file': 'http://promodj.com/download/6984344/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20-%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28CJ%20Prinze%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Modern Talking - Cheri Cheri Lady (DJ INGLINGFX)', 'file': 'http://promodj.com/download/6862693/Modern%20Talking%20-%20Cheri%20Cheri%20Lady%20%28DJ%20INGLINGFX%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Тяни-Толкай - Твои глаза (DEKA Remix)', 'file': 'http://promodj.com/download/6883749/%D0%A2%D1%8F%D0%BD%D0%B8-%D0%A2%D0%BE%D0%BB%D0%BA%D0%B0%D0%B9%20-%20%D0%A2%D0%B2%D0%BE%D0%B8%20%D0%B3%D0%BB%D0%B0%D0%B7%D0%B0%20%28DEKA%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Анна Калашникова - По любви (Maxim Keks Remix)', 'file': 'http://promodj.com/download/6858256/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%9A%D0%B0%D0%BB%D0%B0%D1%88%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2%D0%B0%20-%20%D0%9F%D0%BE%20%D0%BB%D1%8E%D0%B1%D0%B2%D0%B8%20%28Maxim%20Keks%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'МИРА - На абордаж (Vejja Remix V1)', 'file': 'http://promodj.com/download/6821617/%D0%9C%D0%98%D0%A0%D0%90%20-%20%D0%9D%D0%B0%20%D0%B0%D0%B1%D0%BE%D1%80%D0%B4%D0%B0%D0%B6%20%28Vejja%20Remix%20V1%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Anivar - Падает Звезда (Gati Remix)', 'file': 'http://promodj.com/download/6970196/Anivar%20-%20%D0%9F%D0%B0%D0%B4%D0%B0%D0%B5%D1%82%20%D0%97%D0%B2%D0%B5%D0%B7%D0%B4%D0%B0%20%28Gati%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Zivert & Wayne & Steff Da Campo & Dave Crusher - Life (Gokhan Yavuz Mashup)', 'file': 'http://promodj.com/download/6977386/Zivert%20%26%20Wayne%20%26%20Steff%20Da%20Campo%20%26%20Dave%20Crusher%20-%20Life%20%28Gokhan%20Yavuz%20Mashup%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'DJ Sasha Born x Andrea Laddo - Tik Tok (DJ De Maxwill Mashup)', 'file': 'http://promodj.com/download/6978327/DJ%20Sasha%20Born%20x%20Andrea%20Laddo%20-%20Tik%20Tok%20%28DJ%20De%20Maxwill%20Mashup%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'LOBODA - Мира мало (Shnaps & Kolya Funk Remix)', 'file': 'http://promodj.com/download/6927250/LOBODA%20-%20%D0%9C%D0%B8%D1%80%D0%B0%20%D0%BC%D0%B0%D0%BB%D0%BE%20%28Shnaps%20%26%20Kolya%20Funk%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'The Black Eyed Peas, J Balvin - RITMO (Bad Boys For Life) (SAVIN Remix)', 'file': 'http://promodj.com/download/6925864/The%20Black%20Eyed%20Peas%2C%20J%20Balvin%20-%20RITMO%20%28Bad%20Boys%20For%20Life%29%20%28SAVIN%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Evgeny Kotlinsky - Bassland', 'file': 'http://promodj.com/download/6983796/Evgeny%20Kotlinsky%20-%20Bassland%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Maks Barskih & Misha & Sunstarsx - Лей не Жалей (Gokhan Yavuz Mashup)', 'file': 'http://promodj.com/download/6981322/Maks%20Barskih%20%26%20Misha%20%26%20Sunstarsx%20-%20%D0%9B%D0%B5%D0%B9%20%D0%BD%D0%B5%20%D0%96%D0%B0%D0%BB%D0%B5%D0%B9%20%28Gokhan%20Yavuz%20Mashup%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gidayyat x Gazan - КОРОНАМИНУС (Prumo Radio Remix)', 'file': 'http://promodj.com/download/6967967/Gidayyat%20x%20Gazan%20-%20%D0%9A%D0%9E%D0%A0%D0%9E%D0%9D%D0%90%D0%9C%D0%98%D0%9D%D0%A3%D0%A1%20%28Prumo%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Duke-Dumont feat Shaun Ross - Red Light Green Light (Dj Gambella Remix)', 'file': 'http://promodj.com/download/6984069/Duke-Dumont%20feat%20Shaun%20Ross%20-%20Red%20Light%20Green%20Light%20%28Dj%20Gambella%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Basssound - Back to 2007 (Original Mix)', 'file': 'http://promodj.com/download/6986750/Basssound%20-%20Back%20to%202007%20%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Hi-Fi - В облака билет (Eddie G Retro Reboot)', 'file': 'http://promodj.com/download/6974384/Hi-Fi%20-%20%D0%92%20%D0%BE%D0%B1%D0%BB%D0%B0%D0%BA%D0%B0%20%D0%B1%D0%B8%D0%BB%D0%B5%D1%82%20%28Eddie%20G%20Retro%20Reboot%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Taipan Agunda Voxi Innoxi Killjoy Ramirez - Луна Не Знает Пути (V.Gromov Edit)', 'file': 'http://promodj.com/download/6973005/Taipan%20Agunda%20Voxi%20Innoxi%20Killjoy%20Ramirez%20-%20%D0%9B%D1%83%D0%BD%D0%B0%20%D0%9D%D0%B5%20%D0%97%D0%BD%D0%B0%D0%B5%D1%82%20%D0%9F%D1%83%D1%82%D0%B8%20%28V.Gromov%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Barinova - Самый-самый (Solomon08 Remix)', 'file': 'http://promodj.com/download/6976703/Barinova%20-%20%D0%A1%D0%B0%D0%BC%D1%8B%D0%B9-%D1%81%D0%B0%D0%BC%D1%8B%D0%B9%20%28Solomon08%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'MARIA VOITENKO - Deep', 'file': 'http://promodj.com/download/6967652/MARIA%20VOITENKO%20-%20Deep%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': '2Маши Инея ( Ramirez & D. Anuchin Radio Edit )', 'file': 'http://promodj.com/download/6824165/2%D0%9C%D0%B0%D1%88%D0%B8%20%D0%98%D0%BD%D0%B5%D1%8F%20%28%20Ramirez%20%26%20D.%20Anuchin%20Radio%20Edit%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Мот - Капкан (Platinum Monkey Remix)', 'file': 'http://promodj.com/download/6968806/%D0%9C%D0%BE%D1%82%20-%20%D0%9A%D0%B0%D0%BF%D0%BA%D0%B0%D0%BD%20%28Platinum%20Monkey%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chok - I  Have To Say (Andrey Rain Ехtеndеd Remix)', 'file': 'http://promodj.com/download/6979201/Chok%20-%20I%20%20Have%20To%20Say%20%28Andrey%20Rain%20%D0%95%D1%85t%D0%B5nd%D0%B5d%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'The Rumbar,Exodus & Miranda - El Timbal (Akhmetoff Saxxy Edit)', 'file': 'http://promodj.com/download/6984038/The%20Rumbar%2CExodus%20%26%20Miranda%20-%20El%20Timbal%20%28Akhmetoff%20Saxxy%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'The Prodigy - Timebomb Zone (IVAN ADVAN Remix)', 'file': 'http://promodj.com/download/6975097/The%20Prodigy%20-%20Timebomb%20Zone%20%28IVAN%20ADVAN%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Гранды - С днем рождения, братуха (MaxUng Mash)', 'file': 'http://promodj.com/download/6979749/%D0%93%D1%80%D0%B0%D0%BD%D0%B4%D1%8B%20-%20%D0%A1%20%D0%B4%D0%BD%D0%B5%D0%BC%20%D1%80%D0%BE%D0%B6%D0%B4%D0%B5%D0%BD%D0%B8%D1%8F%2C%20%D0%B1%D1%80%D0%B0%D1%82%D1%83%D1%85%D0%B0%20%28MaxUng%20Mash%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Billie Eilish x Kidmen & Andry J - Bad Guy (DJ Baur Edit)', 'file': 'http://promodj.com/download/6822449/Billie%20Eilish%20x%20Kidmen%20%26%20Andry%20J%20-%20Bad%20Guy%20%28DJ%20Baur%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Tyga - Macarena (Dj Mephisto & Dj Demon Remix)', 'file': 'http://promodj.com/download/6976493/Tyga%20-%20Macarena%20%28Dj%20Mephisto%20%26%20Dj%20Demon%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Artik & Asti - Неделимы (DJ PitkiN Remix)', 'file': 'http://promodj.com/download/6354198/Artik%20%26%20Asti%20-%20%D0%9D%D0%B5%D0%B4%D0%B5%D0%BB%D0%B8%D0%BC%D1%8B%20%28DJ%20PitkiN%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'NECHAEV x Khan & Frost & Rakurs & Ramirez - 18 (SAlANDIR Radio Version)', 'file': 'http://promodj.com/download/6982872/NECHAEV%20x%20Khan%20%26%20Frost%20%26%20Rakurs%20%26%20Ramirez%20-%2018%20%28SAlANDIR%20Radio%20Version%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Roddy Ricch - The Box (Denis First Remix) [Radio Mix]', 'file': 'http://promodj.com/download/6971967/Roddy%20Ricch%20-%20The%20Box%20%28Denis%20First%20Remix%29%20%5BRadio%20Mix%5D%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Alex Kolesnikov - Каждый миг (Dj Akoleo remix)', 'file': 'http://promodj.com/download/6983326/Alex%20Kolesnikov%20-%20%D0%9A%D0%B0%D0%B6%D0%B4%D1%8B%D0%B9%20%D0%BC%D0%B8%D0%B3%20%28Dj%20Akoleo%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': '3-ий Январь - Хубба Бубба (izmailloff remix)', 'file': 'http://promodj.com/download/6969499/3-%D0%B8%D0%B9%20%D0%AF%D0%BD%D0%B2%D0%B0%D1%80%D1%8C%20-%20%D0%A5%D1%83%D0%B1%D0%B1%D0%B0%20%D0%91%D1%83%D0%B1%D0%B1%D0%B0%20%28izmailloff%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Анна Тринчер - Короче, Понятно (BONDAR DJ REMIX 2020 )', 'file': 'http://promodj.com/download/6979294/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A2%D1%80%D0%B8%D0%BD%D1%87%D0%B5%D1%80%20-%20%D0%9A%D0%BE%D1%80%D0%BE%D1%87%D0%B5%2C%20%D0%9F%D0%BE%D0%BD%D1%8F%D1%82%D0%BD%D0%BE%20%28BONDAR%20DJ%20REMIX%202020%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Nebezao feat. Андрей Леницкий - Целуешь, прощаешь (Tank REMIX)', 'file': 'http://promodj.com/download/6981079/Nebezao%20feat.%20%D0%90%D0%BD%D0%B4%D1%80%D0%B5%D0%B9%20%D0%9B%D0%B5%D0%BD%D0%B8%D1%86%D0%BA%D0%B8%D0%B9%20-%20%D0%A6%D0%B5%D0%BB%D1%83%D0%B5%D1%88%D1%8C%2C%20%D0%BF%D1%80%D0%BE%D1%89%D0%B0%D0%B5%D1%88%D1%8C%20%28Tank%20REMIX%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dmitry Glushkov feat. СветояРА - Одинокая луна (Lika star cover)', 'file': 'http://promodj.com/download/6978238/Dmitry%20Glushkov%20feat.%20%D0%A1%D0%B2%D0%B5%D1%82%D0%BE%D1%8F%D0%A0%D0%90%20-%20%D0%9E%D0%B4%D0%B8%D0%BD%D0%BE%D0%BA%D0%B0%D1%8F%20%D0%BB%D1%83%D0%BD%D0%B0%20%28Lika%20star%20cover%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
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