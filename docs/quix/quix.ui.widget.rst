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


   .. js:attribute:: QuiX.ui.Widget.top

      Defines the widget's top offset from its parent.
      For a list of accepted values see :js:attr:`~QuiX.ui.Widget.left`.


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


   .. js:attribute:: QuiX.ui.Widget.height

      Defines the widget's height in pixels.
      For a list of accepted values see :js:attr:`~QuiX.ui.Widget.width`.


   .. NOTE:: Changing any of the positioning attributes
             (:js:attr:`~QuiX.ui.Widget.left`, :js:attr:`~QuiX.ui.Widget.top`)
             or sizing attributes (:js:attr:`~QuiX.ui.Widget.width`, :js:attr:`~QuiX.ui.Widget.height`)
             at runtime requires the widget to be redrawn in order for the new values
             to be reflected by using ``w.redraw();``


   .. js:attribute:: QuiX.ui.Widget.div

      Provides access to the DIV element of the widget. The DIV element also
      provides access to the widget by using its ``widget`` attribute.


   .. js:attribute:: QuiX.ui.Widget.parent

      The parent widget.

   .. js:attribute:: QuiX.ui.Widget.widgets

      An array containing all the direct descendants of the widget.


   .. js:attribute:: QuiX.ui.Widget.attributes

      Custom properties bag object.


   .. js:attribute:: QuiX.ui.Widget.__class__

      The widget's constructor function.

Methods
-------

   .. js:function:: QuiX.ui.Widget.appendChild(w [, index])

      Appends a newly created widget.

      :param QuiX.ui.Widget params: The widget to add in the hierarchy
      :param number index: Optional parameter specifying the order of the widget.
                           If omitted the widget will be appended at the end.


   .. js:function:: QuiX.ui.Widget.attachEvent(eventType , handler)

      Attanches a new event handler for a specified event.

      :param string eventType: The type of the event that executes the handler
                               i.e. ``'onclick'``.
      :param function handler: The handler to be executed.

      Example usage::

         w.attachEvent('onclick', function(evt, w) {
            alert('Clicked ' + w.getId());
         });


   .. js:function:: QuiX.ui.Widget.detachEvent(eventType [, handler])

      Detaches an event handler for a specified event type.

      :param string eventType: The type of the event that executes the handler
                               i.e. ``'onclick'``.
      :param function handler: The handler to be detached. If no handler is
         specified then all handlers of a specific event type are detached.


   .. js:function:: QuiX.ui.Widget.trigger(eventType)

      Triggers an event of a specific type.

      :param string eventType: The type of the event to be triggered
         i.e. ``'onclick'``.


   .. js:function:: QuiX.ui.Widget.getWidgetById(id [, shallow, limit])

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

   .. js:function:: QuiX.ui.Widget.redraw([force])

      Redraws the widget. Mostly required for newly appended widgets.

      :param bool force: If ``true`` a full redraw will be done (slower).
                         Default value is ``false``.


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
