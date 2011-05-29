/*******************************************************************************
 * Copyright (c) 2002, 2011 Innoopract Informationssysteme GmbH.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Innoopract Informationssysteme GmbH - initial API and implementation
 *     EclipseSource - ongoing development
 ******************************************************************************/
package org.eclipse.rwt.internal.resources;

import org.eclipse.rwt.internal.engine.RWTConfiguration;
import org.eclipse.rwt.resources.IResourceManager;
import org.eclipse.rwt.resources.IResourceManagerFactory;


public final class DefaultResourceManagerFactory implements IResourceManagerFactory {
  private RWTConfiguration configuration;

  public void setConfiguration( RWTConfiguration configuration ) {
    this.configuration = configuration;
  }

  public IResourceManager create() {
    return new ResourceManagerImpl( configuration );
  }
}