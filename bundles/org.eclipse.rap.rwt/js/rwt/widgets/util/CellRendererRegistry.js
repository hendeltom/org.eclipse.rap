/*******************************************************************************
 * Copyright (c) 2010, 2013 Innoopract Informationssysteme GmbH and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *    Innoopract Informationssysteme GmbH - initial API and implementation
 *    EclipseSource - ongoing development
 ******************************************************************************/

namespace( "rwt.widgets.util" );

(function(){

var Variant = rwt.util.Variant;

rwt.widgets.util.CellRendererRegistry = function() {

  var Wrapper = function() {};
  var rendererMap = {};

  this.add = function( renderer ) {
    checkRenderer( renderer );
    extendRenderer( renderer );
    rendererMap[ renderer.cellType ] = renderer;
  };

  this.getRendererFor = function( type ) {
    return rendererMap[ type ] || null;
  };

  this.removeRendererFor = function( type ) {
    delete rendererMap[ type ];
  };

  this.getAll = function( type ) {
    Wrapper.prototype = rendererMap;
    return new Wrapper();
  };

  var checkRenderer = function( renderer ) {
    if(    renderer == null
        || typeof renderer.contentType !== "string"
        || typeof renderer.cellType !== "string" )
    {
      throw new Error( "Can not register invalid renderer" );
    }
    if( rendererMap[ renderer.cellType ] != null ) {
      throw new Error( "Renderer for cellType " + renderer.cellType + " already registered" );
    }
  };

  var extendRenderer = function( renderer ) {
    var innerCreateElement = renderer.createElement || defaultCreateElement;
    renderer.createElement = function( cellData ) {
      var result = innerCreateElement( cellData );
      result.style.position = "absolute";
      result.style.overflow = "hidden";
      // NOTE : older IE can (in quirksmode) not deal with multiple css classes!
      var cssClass = cellData.selectable ? "rwt-cell-selectable" : "rwt-cell";
      if( rwt.client.Client.isMshtml() ) {
        result.className = cssClass;
      } else {
        result.setAttribute( "class", cssClass );
      }
      return result;
    };
  };

  var defaultCreateElement = function() {
    return document.createElement( "div" );
  };

};


rwt.widgets.util.CellRendererRegistry.getInstance = function() {
  if( !rwt.widgets.util.CellRendererRegistry._instance ) {
    rwt.widgets.util.CellRendererRegistry._instance
      = new rwt.widgets.util.CellRendererRegistry();
  }
  return rwt.widgets.util.CellRendererRegistry._instance;
};

///////////////////
// default renderer

var Encoding = rwt.util.Encoding;

var escapeText = function( text ) {
  var result = Encoding.escapeText( text, false );
  result = Encoding.replaceNewLines( result, "" );
  result = Encoding.replaceWhiteSpaces( result );
  return result;
};

rwt.widgets.util.CellRendererRegistry.getInstance().add( {
  "cellType" : "text",
  "contentType" : "text",
  "createElement" : function( cellData ) {
    var result = document.createElement( "div" );
    if( cellData.alignment && cellData.alignment.RIGHT ) {
      result.style.textAlign = "right";
    } else if( cellData.alignment && cellData.alignment.H_CENTER ) {
      result.style.textAlign = "center";
    } else {
      result.style.textAlign = "left";
    }
    result.style.whiteSpace = cellData.wrap ? "" : "nowrap";
    result.style.textOverflow = "ellipsis";
    return result;
  },
  "renderContent" : Variant.select( "qx.client", {
    "mshtml|newmshtml" : function( element, content, cellData, options ) {
      var text = content || "";
      if( options.markupEnabled ) {
        if( element.rap_Markup !== text ) {
          element.innerHTML = text;
          element.rap_Markup = text;
        }
      } else if( options.seeable ) {
        element.innerText = Encoding.replaceNewLines( text, "" ); // considerably faster
      } else {
        element.innerHTML = escapeText( text );
      }
    },
    "default" : function( element, content, cellData, options ) {
      var text = content || "";
      if( options.markupEnabled ) {
        if( text !== element.rap_Markup ) {
          element.innerHTML = text;
          element.rap_Markup = text;
        }
      } else {
        element.innerHTML = escapeText( text );
      }
    }
  } )
} );

rwt.widgets.util.CellRendererRegistry.getInstance().add( {
  "cellType" : "image",
  "contentType" : "image",
  "renderContent" : function( element, content, cellData, options ) {
    var opacity = options.enabled ? 1 : 0.3;
    rwt.html.Style.setBackgroundImage( element, content, opacity );
  },
  "createElement" : function( cellData ) {
    var result = document.createElement( "div" );
    result.style.backgroundRepeat = "no-repeat";
    var position = [ "center", "center" ];
    if( cellData.scaleMode === "FIT" ) {
      result.style.backgroundSize = "contain";
    } else if( cellData.scaleMode === "FILL" ) {
      result.style.backgroundSize = "cover";
    } else {
      if( cellData.alignment && cellData.alignment.LEFT ) {
        position[ 0 ] = "left";
      } else if( cellData.alignment && cellData.alignment.RIGHT ) {
        position[ 0 ] = "right";
      }
      if( cellData.alignment && cellData.alignment.TOP ) {
        position[ 1 ] = "top";
      } else if( cellData.alignment && cellData.alignment.BOTTOM ) {
        position[ 1 ] = "bottom";
      }
    }
    result.style.backgroundPosition = position.join( " " );
    return result;
  }
} );

}());
