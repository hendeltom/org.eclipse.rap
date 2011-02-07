/*******************************************************************************
 * Copyright (c) 2010 EclipseSource and others. All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   EclipseSource - initial API and implementation
 ******************************************************************************/

qx.Class.define( "org.eclipse.rwt.Animation", {

  extend : qx.core.Target,

  construct : function() {
    this.base( arguments );
    this._renderer = [];
    // properties:
    this._duration = 1000;
    this._transitionFunction = org.eclipse.rwt.Animation.transitions.linear;
    // setup:
    this._startOn = null;
    this._finishOn = null;
    this._totalTime = null;
    this._config = null;
    this._defaultRenderer = null;
    // state info:
    this._isRunning = false;
    this._inQueue = false;
  },

  destruct : function() {
    if( this.isRunning() ) {
      this.skip();
    } else {
      this.cancel();
    }
    try {
      for( var i = 0; i < this._renderer.length; i++ ) {
        this._renderer[ i ].dispose();
      }
    } catch( ex ) {
      throw "Could not Dispose AnimationRenderer: " + ex;
    }
    this._renderer = null;
  },

  events: {
    "init" : "qx.event.type.DataEvent", 
    "finish" : "qx.event.type.DataEvent",
    "cancel" : "qx.event.type.DataEvent"
  },  

  members : {
    
    /////////////
    // Public API
    
    // Time in seconds
    setDuration : function( value ) {
      this._duration = value;
    },
    
    setTransition : function( type ) {
      this._transitionFunction = org.eclipse.rwt.Animation.transitions[ type ];
    },

    setProperties : function( properties ) {
      this.setDuration( properties[ 0 ] );
      this.setTransition( properties[ 1 ] );
    },
       
    getRenderer : function( number ) {
      return this._renderer[ number ];
    },
    
    getDefaultRenderer : function( active ) {
      if( this._defaultRenderer == null || this._defaultRenderer.isDisposed() ) 
      { 
        this._defaultRenderer = new org.eclipse.rwt.AnimationRenderer( this );
      }
      if( typeof active != "undefined" ) {
        this._defaultRenderer.setActive( active );
      }
      return this._defaultRenderer;
    },

    getRendererLength : function() {
      return this._renderer.length;
    },
    
    getRendererIndex : function( renderer ) {
      return this._renderer.indexOf( renderer );
    },
    
    getConfig : function() {
      return this._config;
    },

    // config can by any value, but "appear", "disappear" and "change" are
    // used by AnimationRenderer when autoStart is enabled. When using 
    // the widget-integration of AnimationRenderer, those should be used
    // in the appropriate scenarios. A config is valid between start and cancel,
    // then its set to null. Its given in the setup-function and all events.
    start : function( config ) {
      var result = false;
      if ( !this.isStarted() ) {
        org.eclipse.rwt.Animation._addToQueue( this );
        this._inQueue = true;
        this._config = config;   
        this._init();
        result = this.isStarted(); // animation can be cancelled in "init"
      }
      return result;
    },
    
    restart : function() {
      var result = false;
      if( this.isStarted() ) {
        var config = this._config;
        this.cancel();
        result = this.start( config );
      }
      return result;
    },

    cancel : function() {
      if( this.isStarted() ) {
        this._inQueue = false;
        this._isRunning = false;
        this.createDispatchDataEvent( "cancel", this._config );      
        this._config = null;
        org.eclipse.rwt.Animation._removeFromLoop( this );
      }
    },
    
    // Unlike "cancel", this properly finishs the animation in any case by
    // simply skipping over the remaining frames (If there are any).
    skip : function() {
      if( this.isStarted() ) {
        if( !this.isRunning() ) {
          this._render( 0 );
        }
        this._finish();
      }
    },

    setRendererActive : function( value ) {
      for( var i = 0; i < this._renderer.length; i++ ) {
        this._renderer[ i ].setActive( value );
      }
    },

    activateRendererOnce : function() {
      for( var i = 0; i < this._renderer.length; i++ ) {
        this._renderer[ i ].activateOnce();
      }
    },

    isStarted : function() {
      return this._inQueue;
    },

    isRunning : function() {
      return this._isRunning;
    },

    ////////////
    // internals

    _addRenderer : function( renderer ) {
      this._renderer.push( renderer );
    },

    _removeRenderer : function( renderer ) {
      if( this.isStarted() ) {
        throw "Cannot remove AnimationRenderer: Animation already started!";
      }
      qx.lang.Array.remove( this._renderer, renderer );
    },

    _init : function() {
      this.createDispatchDataEvent( "init", this._config );
      this._startOn = null;
      this._numberRenderer = this._renderer.length;
    },

    _loop : function( time ) {
      if( this._startOn == null ) {
        this._startOn = new Date().getTime();
        this._finishOn = this._startOn + ( this._duration );
        this._totalTime = this._duration;
      }
      if ( time >= this._finishOn ) {
        this._finish();
      } else {
        var position = ( time - this._startOn ) / this._totalTime;  
        this._render( position );
      }
    },

    _render : function( position ) {
      var maxRenderer = this._renderer.length;
      if( !this._isRunning ) {
        for( var i = 0; i < this._numberRenderer; i++ ) {
          this._renderer[ i ]._setup( this._config );
        }
        this._isRunning = true;
      }
      var transitionValue = this._transitionFunction( position );
      for( var i = 0; i < this._numberRenderer; i++ ) {
        this._renderer[ i ]._render( transitionValue );
      }      
    },

    _finish : function() {
      this._render( 1 );
      var config = this._config;
      this.cancel();
      for( var i = 0; i < this._numberRenderer; i++ ) {
        this._renderer[ i ]._finish( config );
      }            
      this.createDispatchDataEvent( "finish", config );
    }

  },
  
  statics : {

    ///////////////
    // Global Queue 

    FPS : 60,
    _queue : [],
    _interval : null,

    _addToQueue : function( animation ) {
      this._queue.push( animation );  
      if ( this._interval == null ) {
        this._startLoop();
      }
    },

    _removeFromLoop : function( animation ) {
      qx.lang.Array.remove( this._queue, animation );  
      if( this._queue.length == 0 ) {
        this._stopLoop();
      }
    },

    _startLoop : function() {
      this._interval 
        = setInterval( this._mainLoop, Math.round( 1000 / this.FPS ) );
    },

    _stopLoop : function() {
      window.clearInterval( this._interval );
      this._interval = null;
    },

    _mainLoop : function() {
      try {
        if( !org.eclipse.swt.EventUtil.getSuspended() ) {
          var time = new Date().getTime();
          var queue = org.eclipse.rwt.Animation._queue;
          try{
            for ( var i=0, len = queue.length; i < len; i++ ) {
              queue[ i ] && queue[ i ]._loop( time );
            }
          } catch( e ) {
            // prevent endless error-messages:
            org.eclipse.rwt.Animation._stopLoop();
            throw "Animation aborted: " + e;
          }
        }
      } catch( ex ) {
        org.eclipse.swt.Request.getInstance().processJavaScriptError( ex );
      }
    },
    
    ////////
    // Util
    
    blockGlobalFlushs : function( value ) {
      qx.ui.core.Widget._inFlushGlobalQueues = value;
      if( !value ) {
        qx.ui.core.Widget._initAutoFlush( 0 );
      }
    },
    
    //////////////
    // Transitions
    
    transitions : {
        
      linear : function( position ) {
        return position;
      },

      ease : function ( position ) {
        var easeOut = -Math.pow( position - 1 , 2 ) + 1;
        return ( -Math.cos( easeOut *  Math.PI ) / 2 ) + 0.5;
      },

      easeIn : function ( position ) {
        return Math.pow( position, 2 );
      },

      easeOut : function ( position ) {
        return -Math.pow( position - 1 , 2 ) + 1;
      },

      easeInOut : function( position ) {
        return ( -Math.cos( position * Math.PI ) / 2 ) + 0.5;
      }

    }

  }

} );
