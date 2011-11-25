.. highlight:: js

Widget (Base Widget Class)
==========================

.. js:class:: QuiX.ui.Widget(params)

   Creates a new widget (rectangle).

   :param object params: The parameters object

   Example usage::

      var w = new QuiX.ui.Widget({left: 0,
                                  top: 0,
                                  width: '100%',
                                  height: 50});

   XML markup:

   .. code-block:: xml

      <rect left="0" top="0" width="100%" height="50"></rect>

Attributes
----------

The :js:class:`~QuiX.ui.Widget` objects expose the following attributes:

.. js:attribute:: QuiX.ui.Widget.left

   Defines the widget's left offset from its parent.
   This offset can be set to:

   * A number::

      w.left = 32;

   * A percentage::

      w.left = '50%';

   * A function. The following example is equivalent to '50%'::

      w.left = function(memo) {
          return this.parent.getWidth(false, memo) * 0.5;
      };

   * A string that eventually is transformed into a single line function::

      w.left = 'this.parent.getWidth(false, memo) * 0.5';

   * For the widget to remain centered even if its parent is resized
     use ``'center'``::

      w.left = 'center';

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Widget.top

   Defines the widget's top offset from its parent.
   For a list of accepted values see :js:attr:`~QuiX.ui.Widget.left`.

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Widget.width

   Defines the widget's width in pixels.
   Valid values are:

   * A number::

      w.width = 100;

   * A percentage of its parent width::

      w.width = '50%';

   * A function. The following example is equivalent to '50%'::

      w.width = function(memo) {
          return this.parent.getWidth(false, memo) * 0.5;
      };

   * A string that eventually is transformed into a single line function::

      w.width = 'this.parent.getWidth(false, memo) * 0.5';

   * ``'auto'`` The widget's width will be automatically adjusted in order to include its children::

      w.width = 'auto';

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Widget.height

   Defines the widget's height in pixels.
   For a list of accepted values see :js:attr:`~QuiX.ui.Widget.width`.


.. NOTE:: Changing any of the positioning attributes
          (:js:attr:`~QuiX.ui.Widget.left`, :js:attr:`~QuiX.ui.Widget.top`)
          or sizing attributes (:js:attr:`~QuiX.ui.Widget.width`, :js:attr:`~QuiX.ui.Widget.height`)
          at runtime requires the widget to be redrawn in order for the new values
          to be reflected by using ``w.redraw();``

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Widget.div

   Provides access to the DIV element of the widget. The DIV element also
   provides access to the widget by using its ``widget`` attribute.

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Widget.parent

   The parent widget.

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Widget.widgets

   An array containing all the direct descendants of the widget.

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Widget.attributes

   Custom properties bag object. Defining custom attributes at runtime
   is as simple as::

     w.attributes.myCustomAttribute = value;

   Using XML markup to define custom attributes:

   .. code-block:: xml

     <rect left="0" top="0" width="100%" height="50">
       <prop name="customString" value="someString"/>
       <prop name="customInt" type="int" value="3"/>
       <prop name="customFloat" type="float" value="3.5"/>
       <prop name="customBool" type="bool" value="1"/>
       <prop name="customListOfStrings" type="strlist" delimiter=";" value="a;b;c"/>
       <prop name="customJson" type="json" value="[1,2,3]"/>
     </rect>

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Widget.__class__

   The widget's constructor function.

Methods
-------

.. js:function:: QuiX.ui.Widget.appendChild(w [, index])

   Appends a newly created widget.

   :param QuiX.ui.Widget w: The widget to add in the hierarchy
   :param number index: Optional parameter specifying the order of the widget.
                        If omitted the widget will be appended at the end.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.attachEvent(eventType , handler)

   Attanches a new event handler for a specified event.

   :param string eventType: The type of the event that executes the handler
                            i.e. ``'onclick'``.
   :param function handler: The handler to be executed.

   Example usage::

      w.attachEvent('onclick', function(evt, w) {
         alert('Clicked ' + w.getId());
      });

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.detachEvent(eventType [, handler])

   Detaches an event handler for a specified event type.

   :param string eventType: The type of the event that executes the handler
                            i.e. ``'onclick'``.
   :param function handler: The handler to be detached. If no handler is
      specified then all handlers of a specific event type are detached.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.trigger(eventType)

   Triggers an event of a specific type.

   :param string eventType: The type of the event to be triggered
      i.e. ``'onclick'``.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.query(evalFunc, shallow, limit)

   Queries the widget hierarchy by applying a certain function for each
   widget.

   :param function evalFunc: the function to apply.
   :param bool shallow: Parameter specifying if this is a shallow search.
   :param number limit: Limit the search to certain number of widgets.
      Use ``null`` for no limit.
   :returns: an array of widgets for which the evaluation function has
      returned ``true``.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getWidgetById(id [, shallow, [limit]])

   Searches the widget hierarchy and returns the widgets with the specified ID.

   :param string id: the ID of the widget searched
   :param bool shallow: Optional parameter specifying if this is a shallow search.
                        Default value is ``false``.
   :param number limit: Specify optionally the maximum number of widgets to return.
                        If set to 1 the first widget found will be returned.
                        Used mainly for speed optimization purposes.
   :returns:
             An array of widgets with the specified ID or the widget
             itself if only one widget is found.

   .. TIP:: If the current document contains a single desktop and searching
            for a single widget ``document.getElementById(ID).widget`` works
            faster.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.redraw([force])

   Redraws the widget. Mostly required for newly appended widgets.

   :param bool force: If ``true`` a full redraw will be done (slower).
                      Default value is ``false``.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getDesktop()

   :returns: Returns the top level widget (desktop) that the current widget
      is contained in. Useful when having multiple QuiX UIs living inside the
      same DOM document.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.nextSibling()

   :returns: Returns the next sibling widget. If the widget is the last child of
      its parent ``null`` is returned.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.previousSibling()

   :returns: Returns the previous sibling widget. If the widget is the first
      child of its parent ``null`` is returned.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.print([expand])

   Prints the current widget.

   :param bool expand: If set to ``true`` the widget will expand horizontally
     to the page boundaries. Default value is ``false``.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.hide()

   Hides the current widget.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.show()

   Shows the current widget.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.isHidden()

   :return: ``true`` if the widget is hidden, otherwise ``false``.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.clear()

   Destroys all the widget's children.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.destroy()

   Destroys the widget and all of its children.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.resize(width, height)

   Resizes the widget to the given size.

   :param width: see :js:attr:`~QuiX.ui.Widget.width` for allowed values
   :param height: see :js:attr:`~QuiX.ui.Widget.width` for allowed values

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.moveTo(x, y)

   Moves the widget to the given position.

   :param x: see :js:attr:`~QuiX.ui.Widget.left` for allowed values
   :param y: see :js:attr:`~QuiX.ui.Widget.left` for allowed values

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.click()

   Emulates the click event causing all ``'onclick'`` handlers to be
   executed.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.moveForward()

   Moves the widget one step forward.

   If it is absolutely positioned then its z-index is adjusted accordingly.

   Otherwise the widget's DIV element is removed and appended before its
   previous sibling's DIV.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.moveBackward()

   Moves the widget one step backward.

   If it is absolutely positioned then its
   z-index is adjusted accordingly.

   Otherwise the widget's DIV element is removed and appended after its
   next sibling's DIV.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.bringToFront()

   Moves the widget at the beginning of its
   parent's :js:attr:`~QuiX.ui.Widget.widgets` array.

   If it is absolutely positioned then the widget is brought to the front
   of the z-order.

   Otherwise, the widget's DIV element is removed and appended as the first
   child of its parert.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.sendToBack()

   Moves the widget at the end of its
   parent's :js:attr:`~QuiX.ui.Widget.widgets` array.

   If it is absolutely positioned then the widget is sent to the back
   of the z-order.

   Otherwise, the widget's DIV element is removed and appended as the last
   child of its parert.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getScreenLeft()

   :returns: the widget's left offset from the top level widget.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getScreenTop()

   :returns: the widget's top offset from the top level widget.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getLeftOffsetFrom([w])

   Returns the widget's left offset from the provided widget's DIV element.
   The current widget must be contained in w.

   :param QuiX.ui.Widget w: Optional parameter. If omitted then the top level
      widget is assumed.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getTopOffsetFrom([w])

   Returns the widget's top offset from the provided widget's DIV element.
   The current widget must be contained in w.

   :param QuiX.ui.Widget w: Optional parameter. If omitted then the top level
      widget is assumed.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getWidth([full [,memo]])

   Returns the widget's width in pixels.

   :param bool full: If ``true`` the full width is returned. If ``false``
      (default) then the widget's client area is returned (excluding border width
      and padding offsets).
   :param object memo: Optional parameter used for optimization purposes. If
     calling this method inside a redraw loop this parameter contains info for
     avoiding calculating the same parameter twice.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getHeight([full [,memo]])

   Returns the widget's height in pixels.

   :param bool full: If ``true`` the full width is returned. If ``false``
      (default) then the widget's client area is returned (excluding border width
      and padding offsets).
   :param object memo: Optional parameter used for optimization purposes. If
     calling this method inside a redraw loop this parameter contains info for
     avoiding calculating the same parameter twice.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getTop()

   Returns the widget's top offset from its parent in pixels.

   .. NOTE:: The parent's top padding is excluded.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getLeft()

   Returns the widget's left offset from its parent in pixels.

   .. NOTE:: The parent's left padding is excluded.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.addClass(className)

   Adds the provided CSS class to the widget's DIV.

   :param string className: The name of the CSS class to add

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.removeClass(className)

   Removes the provided CSS class from the widget's DIV.

   :param string className: The name of the CSS class to remove

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.hasClass(className)

   Check if the specified CSS class is added to the widget's DIV.

   :param string className: The name of the CSS class to check for
   :returns: ``true`` if the widget's DIV has the specified class. Otherwise,
      ``false``.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getPadding(padding)

   Returns the widget's padding offsets in pixels.

   :returns: an array of four numbers in the form
      of [left, right, top, bottom] i.e. ``[1, 1, 1, 1]``

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.setPadding(padding)

   Sets the widget's padding offsets in pixels.

   :param array padding: an array of four numbers in the form
      of [left, right, top, bottom] i.e. ``[1, 1, 1, 1]``

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.addPaddingOffset(where, offset)

   Adds padding offset to an certain side.

   :param string where: where to add padding offset (``'Left'``,
      ``'Right'``, ``'Top'`` or ``'Bottom'``)
   :param number offset: the offset to add or remove if negative

.. NOTE:: Changing any of the padding offsets at runtime requires the widget
   to be redrawn in order for the new values to be reflected by using ``w.redraw();``

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getOpacity()

   :returns: The widget's opacity expressed as a float number between 0 and 1.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.setOpacity(op)

   Adjusts the widget's opacity.

   :param number op: The opacity expressed as a float number between 0 and 1.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getPosition()

   :returns: The widget's CSS position.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.setPosition(pos)

   Sets the widget's CSS position attribute.

   :param string pos: a valid CSS position setting. Supported values are
      ``'absolute'`` (default), ``'relative'`` and ``''``.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getOverflow()

   :returns: The widget's overflow setting.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.setOverflow(overflow)

   Sets the widget's CSS overflow behavior.

   :param string overflow: Supported values are
      ``'visible'`` (default), ``'hidden'``, ``'auto'`` and ``'scroll'``.

   .. TIP:: You can set different overflow setting by axis using
      ``'overflow-x overflow-y'`` i.e. ``'hidden auto'``.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getDisplay()

   :returns: The widget's CSS display value.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.setDisplay(display)

   Sets the widget's CSS display value.

   The following code::

      w.setDisplay('hidden');

   is equivalent with::

      w.hide();

   :param string display: a valid CSS display value.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getBgColor()

   :returns: The widget's background color as described in :js:func:`~QuiX.ui.Widget.setBgColor`.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.setBgColor(color)

   Sets the widget's background color.

   :param string color: the widget's background color.

      Valid formats are:

         * a single color i.e. ``'#CCCCCC'`` or ``'rgba(192, 192, 192, 0.5)'``.
         * a two color gradient ``'top,#CCCCCC,#333333'`` (vertical)
           or ``'left,#CCCCCC,#333333'`` (horizontal)
         * a gradient with stop points ``'top,20% #CCCCCC,80% #333333'``. Supported
           directions are ``'top'``, ``'left'``, ``'top left'`` and ``'bottom left'``.

   .. NOTE:: On IE gradient stop points are not supported yet (only two color
      gradients). On older verstions of Opera which do not support gradients,
      QuiX fallbacks to solid background.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getId()

   :returns: The widget's ID.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.setId(id)

   Sets the widget's ID.

   :param string id: the id to set

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getRotation()

   :returns: The current widget's rotation in degrees.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.setRotation(deg)

   Rotates the widget by ``deg`` degrees.

   :param number deg: the degrees

   .. NOTE:: On borwsers that do not support CSS transforms this is simply
      ignored.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.getShadow()

   :returns: The widget's CSS box shadow value.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Widget.setShadow(shadow)

   Sets the widget's CSS box shadow value.

   :param array shadow: an array of the following format
      ``[offset-x, offset-y, blur, color]`` i.e. ``[4, 4, 2, '#CCCCCC']``

   .. NOTE:: On borwsers that do not support the CSS box-shadow attribute
      this call gets ignored.

Events
------

DOM Events
^^^^^^^^^^

onmousedown, onmouseup, onmousemove, onmouseover, onmouseout,
onkeypress, onkeyup, onkeydown, onclick, ondblclick, onscroll,
oncontextmenu

Custom Events
^^^^^^^^^^^^^

onswipe, onload, onunload, onresize, ondrop
